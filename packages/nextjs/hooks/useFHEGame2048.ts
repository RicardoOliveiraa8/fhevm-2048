"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "./helper";
import { useWagmiEthers } from "./wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm-sdk";
import {
  buildParamsFromAbi,
  getEncryptionMethod,
  useFHEDecrypt,
  useFHEEncryption,
  useInMemoryStorage,
} from "@fhevm-sdk";
import { ethers } from "ethers";
import { useReadContract } from "wagmi";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";

export const useFHEGame2048 = (args: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { instance, initialMockChains } = args;
  const { storage: decSigStore } = useInMemoryStorage();
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  const activeChain = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: gameContract } = useDeployedContractInfo({
    contractName: "FHEGame2048",
    chainId: activeChain,
  });

  type Game2048ContractInfo = Contract<"FHEGame2048"> & { chainId?: number };

  const [statusMsg, setStatusMsg] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const hasContract = Boolean(gameContract?.address && gameContract?.abi);
  const hasSigner = Boolean(ethersSigner);
  const hasProvider = Boolean(ethersReadonlyProvider);

  const getGameContract = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const provOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!provOrSigner) return undefined;
    return new ethers.Contract(gameContract!.address, (gameContract as Game2048ContractInfo).abi, provOrSigner);
  };

  // Fetch encrypted score history
  const { data: encryptedScores, refetch: refreshScores } = useReadContract({
    address: hasContract ? (gameContract!.address as `0x${string}`) : undefined,
    abi: hasContract ? ((gameContract as Game2048ContractInfo).abi as any) : undefined,
    functionName: "fetchCipherScores",
    args: [accounts ? accounts[0] : ""],
    query: { enabled: Boolean(hasContract && hasProvider), refetchOnWindowFocus: false },
  });

  // Build decrypt requests for each score
  const decryptRequests = useMemo(() => {
    if (!encryptedScores || !Array.isArray(encryptedScores)) return undefined;
    return encryptedScores.map(item => ({
      handle: item,
      contractAddress: gameContract!.address,
    }));
  }, [encryptedScores, gameContract?.address]);

  // FHE decrypt hook
  const {
    canDecrypt: canDecryptScores,
    decrypt: decryptScores,
    isDecrypting: isDecryptingScores,
    message: decryptMsg,
    results: decryptedScores,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage: decSigStore,
    chainId,
    requests: decryptRequests,
  });

  useEffect(() => {
    if (decryptMsg) setStatusMsg(decryptMsg);
  }, [decryptMsg]);

  // FHE encryption hook
  const { encryptWith } = useFHEEncryption({
    instance,
    ethersSigner: ethersSigner as any,
    contractAddress: gameContract?.address,
  });

  const canSubmit = useMemo(
    () => Boolean(hasContract && instance && hasSigner && !isBusy),
    [hasContract, instance, hasSigner, isBusy],
  );

  const getEncryptionMethodFor = (fnName: "recordEncryptedRun") => {
    const fnAbi = gameContract?.abi.find(item => item.type === "function" && item.name === fnName);
    if (!fnAbi) return { method: undefined as string | undefined, error: `No ABI for ${fnName}` };
    if (!fnAbi.inputs || fnAbi.inputs.length === 0)
      return { method: undefined as string | undefined, error: `No inputs for ${fnName}` };
    return { method: getEncryptionMethod(fnAbi.inputs[0].internalType), error: undefined };
  };

  // Submit encrypted score (e.g., 1024, 2048, 4096)
  const submitEncryptedScore = useCallback(
    async (scoreValue: number) => {
      if (isBusy || !canSubmit) return;
      setIsBusy(true);
      setStatusMsg(`Encrypting and submitting score (${scoreValue})...`);
      try {
        const { method, error } = getEncryptionMethodFor("recordEncryptedRun");
        if (!method) return setStatusMsg(error ?? "Missing encryption method");
        const encData = await encryptWith(builder => {
          (builder as any)[method](scoreValue);
        });
        if (!encData) return setStatusMsg("Encryption failed");
        const contractWrite = getGameContract("write");
        if (!contractWrite) return setStatusMsg("Contract unavailable or signer missing");
        const params = buildParamsFromAbi(encData, [...gameContract!.abi] as any[], "recordEncryptedRun");
        const tx = await contractWrite.recordEncryptedRun(...params, { gasLimit: 300_000 });
        setStatusMsg("Waiting for transaction confirmation...");
        await tx.wait();
        setStatusMsg(`Encrypted score (${scoreValue}) recorded!`);
        await refreshScores();
      } catch (e) {
        setStatusMsg(`recordEncryptedRun() failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy, canSubmit, encryptWith, getGameContract, refreshScores, gameContract?.abi],
  );

  useEffect(() => {
    setStatusMsg("");
  }, [accounts, chainId]);

  return {
    contractAddress: gameContract?.address,
    canDecryptScores,
    decryptScores,
    isDecryptingScores,
    decryptedScores,
    encryptedScores,
    refreshScores,
    submitEncryptedScore,
    isProcessing: isBusy,
    canSubmit,
    chainId,
    accounts,
    isConnected,
    ethersSigner,
    message: statusMsg,
  };
};
