import os
import json
import base64
import math
import subprocess
from typing import List, Dict, Any, Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class IPFSVectorVault:
    """
    Decentralized, zero-knowledge Vector Vault using Content-Addressed IPFS Storage.
    Raw content is AES-256-GCM encrypted, stored in public IPFS, and indexed locally
    using a compact text/JSONL file containing:
    CID | AES-256 Key | Vector Embedding
    """
    def __init__(self, vault_path: str = "ipfs_vector_vault.jsonl", ipfs_host: str = "http://127.0.0.1:5001"):
        self.vault_path = vault_path
        self.ipfs_host = ipfs_host
        self.index: List[Dict[str, Any]] = []
        self.load_vault()

    def load_vault(self):
        """Loads the flat-file vector database into memory."""
        self.index = []
        if os.path.exists(self.vault_path):
            with open(self.vault_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        self.index.append(json.loads(line.strip()))
            print(f"[IPFSVault] Loaded {len(self.index)} vector records from {self.vault_path}")

    def _encrypt(self, plaintext: str) -> (bytes, str):
        """Encrypts plaintext with AES-256-GCM and generates a 32-byte secret key."""
        key = AESGCM.generate_key(bit_length=256)
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        payload = nonce + ciphertext
        return payload, base64.b64encode(key).decode("utf-8")

    def _decrypt(self, payload: bytes, key_b64: str) -> str:
        """Decrypts AES-256-GCM payload using the base64-encoded key."""
        key = base64.b64decode(key_b64)
        aesgcm = AESGCM(key)
        nonce = payload[:12]
        ciphertext = payload[12:]
        plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext_bytes.decode("utf-8")

    def _ipfs_add(self, data_bytes: bytes) -> str:
        """Pushes raw bytes to the local IPFS node and returns the Content Identifier (CID)."""
        proc = subprocess.run(
            ["ipfs", "add", "-Q"],
            input=data_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        return proc.stdout.decode("utf-8").strip()

    def _ipfs_cat(self, cid: str) -> bytes:
        """Fetches raw bytes from the IPFS network using its CID."""
        proc = subprocess.run(
            ["ipfs", "cat", cid],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        return proc.stdout

    def add_document(self, text: str, embedding: List[float], metadata: Optional[Dict[str, Any]] = None) -> str:
        """Encrypts document, pins to IPFS, and appends the vector mapping to the flat file."""
        encrypted_bytes, key_b64 = self._encrypt(text)
        cid = self._ipfs_add(encrypted_bytes)

        record = {
            "cid": cid,
            "key": key_b64,
            "vector": embedding,
            "metadata": metadata or {}
        }
        self.index.append(record)

        with open(self.vault_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")

        return cid

    def query(self, query_vector: List[float], top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Calculates cosine similarity across all vectors in RAM in microseconds,
        retrieves the top matching encrypted chunks from IPFS, and decrypts them on the fly.
        """
        if not self.index:
            return []

        scored = []
        for rec in self.index:
            doc_vec = rec["vector"]
            # Cosine similarity calculation
            dot = sum(a * b for a, b in zip(query_vector, doc_vec))
            norm_q = math.sqrt(sum(a * a for a in query_vector))
            norm_d = math.sqrt(sum(b * b for b in doc_vec))
            sim = dot / (norm_q * norm_d) if (norm_q > 0 and norm_d > 0) else 0.0
            scored.append((sim, rec))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:top_k]

        results = []
        for sim, rec in top:
            # Fetch encrypted chunk from IPFS swarm
            raw_encrypted = self._ipfs_cat(rec["cid"])
            # Decrypt in local memory
            plaintext = self._decrypt(raw_encrypted, rec["key"])
            results.append({
                "score": sim,
                "cid": rec["cid"],
                "content": plaintext,
                "metadata": rec["metadata"]
            })

        return results

if __name__ == "__main__":
    vault = IPFSVectorVault()
    print("IPFS Vector Vault Module Initialized Successfully.")
