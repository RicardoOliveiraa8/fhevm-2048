import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FHEGame2048, FHEGame2048__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Players = {
  admin: HardhatEthersSigner;
  player1: HardhatEthersSigner;
  player2: HardhatEthersSigner;
};

async function deployGame2048() {
  const factory = (await ethers.getContractFactory("FHEGame2048")) as FHEGame2048__factory;
  const game = (await factory.deploy()) as FHEGame2048;
  const addr = await game.getAddress();
  return { game, addr };
}

describe("🧩 FHEGame2048 - Encrypted Score Ledger", function () {
  let players: Players;
  let game: FHEGame2048;
  let gameAddr: string;

  before(async () => {
    const [admin, p1, p2] = await ethers.getSigners();
    players = { admin, player1: p1, player2: p2 };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("⚠️ Requires local FHEVM mock for these scenarios");
      this.skip();
    }
    ({ game, addr: gameAddr } = await deployGame2048());
  });

  it("new players should have no stored scores", async () => {
    const scores = await game.fetchCipherScores(players.player1.address);
    expect(scores.length).to.eq(0);
    const hasData = await game.hasEncryptedData(players.player1.address);
    expect(hasData).to.be.false;
  });

  it("allows submitting and retrieving a single encrypted score", async () => {
    const enc = await fhevm.createEncryptedInput(gameAddr, players.player1.address).add32(4096).encrypt();

    await (await game.connect(players.player1).recordEncryptedRun(enc.handles[0], enc.inputProof)).wait();

    const stored = await game.fetchCipherScores(players.player1.address);
    expect(stored.length).to.eq(1);

    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, stored[0], gameAddr, players.player1);
    expect(decrypted).to.eq(4096);
  });

  it("can log multiple scores for the same player", async () => {
    const scoresToLog = [1024, 2048, 4096];
    for (const score of scoresToLog) {
      const enc = await fhevm.createEncryptedInput(gameAddr, players.player1.address).add32(score).encrypt();
      await (await game.connect(players.player1).recordEncryptedRun(enc.handles[0], enc.inputProof)).wait();
      await ethers.provider.send("evm_mine", []);
    }

    const history = await game.fetchCipherScores(players.player1.address);
    expect(history.length).to.eq(scoresToLog.length);

    for (let i = 0; i < history.length; i++) {
      const val = await fhevm.userDecryptEuint(FhevmType.euint32, history[i], gameAddr, players.player1);
      expect(val).to.eq(scoresToLog[i]);
    }
  });

  it("ensures that players cannot see each other's scores", async () => {
    const enc1 = await fhevm.createEncryptedInput(gameAddr, players.player1.address).add32(2048).encrypt();
    await game.connect(players.player1).recordEncryptedRun(enc1.handles[0], enc1.inputProof);

    const enc2 = await fhevm.createEncryptedInput(gameAddr, players.player2.address).add32(1024).encrypt();
    await game.connect(players.player2).recordEncryptedRun(enc2.handles[0], enc2.inputProof);

    const hist1 = await game.fetchCipherScores(players.player1.address);
    const hist2 = await game.fetchCipherScores(players.player2.address);

    expect(hist1.length).to.eq(1);
    expect(hist2.length).to.eq(1);

    const val1 = await fhevm.userDecryptEuint(FhevmType.euint32, hist1[0], gameAddr, players.player1);
    const val2 = await fhevm.userDecryptEuint(FhevmType.euint32, hist2[0], gameAddr, players.player2);

    expect(val1).to.eq(2048);
    expect(val2).to.eq(1024);
  });

  it("handles repeated identical scores correctly", async () => {
    const repeatedScores = [512, 512];
    for (const s of repeatedScores) {
      const enc = await fhevm.createEncryptedInput(gameAddr, players.player1.address).add32(s).encrypt();
      await (await game.connect(players.player1).recordEncryptedRun(enc.handles[0], enc.inputProof)).wait();
    }

    const history = await game.fetchCipherScores(players.player1.address);
    expect(history.length).to.eq(2);

    for (const h of history) {
      const val = await fhevm.userDecryptEuint(FhevmType.euint32, h, gameAddr, players.player1);
      expect(val).to.eq(512);
    }
  });

  it("supports maximum uint32 score values", async () => {
    const maxScore = 2 ** 32 - 1;
    const enc = await fhevm.createEncryptedInput(gameAddr, players.player1.address).add32(maxScore).encrypt();
    await (await game.connect(players.player1).recordEncryptedRun(enc.handles[0], enc.inputProof)).wait();

    const history = await game.fetchCipherScores(players.player1.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, history[0], gameAddr, players.player1);
    expect(decrypted).to.eq(maxScore);
  });

  it("maintains chronological order for multiple runs", async () => {
    const runs = [1024, 2048, 4096];
    for (const r of runs) {
      const enc = await fhevm.createEncryptedInput(gameAddr, players.player1.address).add32(r).encrypt();
      await (await game.connect(players.player1).recordEncryptedRun(enc.handles[0], enc.inputProof)).wait();
    }

    const all = await game.fetchCipherScores(players.player1.address);
    expect(all.length).to.eq(runs.length);

    const first = await fhevm.userDecryptEuint(FhevmType.euint32, all[0], gameAddr, players.player1);
    const last = await fhevm.userDecryptEuint(FhevmType.euint32, all[all.length - 1], gameAddr, players.player1);

    expect(first).to.eq(runs[0]);
    expect(last).to.eq(runs[runs.length - 1]);
  });

  it("supports rapid consecutive submissions without errors", async () => {
    const rapidScores = [256, 512, 1024];
    for (const s of rapidScores) {
      const enc = await fhevm.createEncryptedInput(gameAddr, players.player1.address).add32(s).encrypt();
      await game.connect(players.player1).recordEncryptedRun(enc.handles[0], enc.inputProof);
    }

    const stored = await game.fetchCipherScores(players.player1.address);
    expect(stored.length).to.eq(rapidScores.length);

    const last = await fhevm.userDecryptEuint(FhevmType.euint32, stored[stored.length - 1], gameAddr, players.player1);
    expect(last).to.eq(rapidScores[rapidScores.length - 1]);
  });
});
