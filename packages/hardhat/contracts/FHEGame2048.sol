// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEGame2048
 * @notice On-chain encrypted score tracker for the 2048 puzzle game.
 *         Each run's score is stored privately using Fully Homomorphic Encryption (FHE),
 *         ensuring no plaintext game data ever appears on-chain.
 *
 * @dev Core flow:
 *      - Player finishes a run in 2048, obtains a score (e.g., 2048, 4096...).
 *      - The score is encrypted off-chain and submitted with a valid proof.
 *      - Only the player who submitted can later decrypt and view their results.
 */
contract FHEGame2048 is ZamaEthereumConfig {
    /// @dev Stores all encrypted scores per player.
    mapping(address => euint32[]) private _playerCipherScores;

    /**
     * @notice Log an encrypted score from a completed 2048 game session.
     * @param cipherScore The player’s encrypted score (externalEuint32 format).
     * @param zkProof Zero-knowledge proof verifying ciphertext correctness.
     *
     * @dev The ciphertext is converted to internal form and appended
     *      to the sender’s encrypted score list. Decryption rights are
     *      granted exclusively to that player.
     */
    function recordEncryptedRun(externalEuint32 cipherScore, bytes calldata zkProof) external {
        euint32 internalScore = FHE.fromExternal(cipherScore, zkProof);
        FHE.allowThis(internalScore);

        _playerCipherScores[msg.sender].push(internalScore);

        FHE.allow(internalScore, msg.sender);
    }

    /**
     * @notice Fetch all encrypted scores of a given player.
     * @param gamer The wallet address of the player.
     * @return scores List of encrypted 2048 scores belonging to that player.
     *
     * @dev The contract never exposes decrypted values — decryption
     *      must be performed off-chain using the player’s FHE keypair.
     */
    function fetchCipherScores(address gamer) external view returns (euint32[] memory scores) {
        return _playerCipherScores[gamer];
    }

    /**
     * @notice Return how many encrypted sessions a player has recorded.
     * @param gamer The address of the player.
     * @return totalRuns Number of submitted encrypted score entries.
     */
    function getRunCount(address gamer) external view returns (uint256 totalRuns) {
        return _playerCipherScores[gamer].length;
    }

    /**
     * @notice Verify if a player has ever logged a 2048 session.
     * @param gamer Address to check.
     * @return hasData True if the player has at least one encrypted score stored.
     */
    function hasEncryptedData(address gamer) external view returns (bool hasData) {
        return _playerCipherScores[gamer].length > 0;
    }
}
