'''Blockchain interaction utilities using web3.py'''

import os
import json
from pathlib import Path
from web3 import Web3
from web3.exceptions import ContractLogicError
from backend.config import settings

# Helper getters to dynamically fetch current config
def get_rpc_url() -> str:
    url = settings.web3_rpc_url.strip() if settings.web3_rpc_url else os.getenv("WEB3_RPC_URL", "http://127.0.0.1:8545")
    return url.strip()

def get_contract_address() -> str:
    addr = settings.fi_contract_address.strip() if settings.fi_contract_address else os.getenv("FI_CONTRACT_ADDRESS", "")
    # If not found in settings/env, attempt reading from shared container volume if present
    if not addr and os.path.exists("/app/env-out/contract.env"):
        try:
            with open("/app/env-out/contract.env", "r") as f:
                for line in f:
                    if line.startswith("FI_CONTRACT_ADDRESS="):
                        addr = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    return addr.strip()

def get_private_key() -> str:
    pk = settings.fi_private_key.strip() if settings.fi_private_key else os.getenv("FI_PRIVATE_KEY", "")
    return pk.strip()

# Minimal ABI for the FireInsurance contract (registerEvent & EventRegistered event)
ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "deviceId", "type": "string"},
            {"internalType": "string", "name": "propertyId", "type": "string"},
            {"internalType": "int256", "name": "temperature", "type": "int256"},
            {"internalType": "uint256", "name": "smokeLevel", "type": "uint256"},
            {"internalType": "bool", "name": "flameDetected", "type": "bool"},
            {"internalType": "bool", "name": "verified", "type": "bool"}
        ],
        "name": "registerEvent",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "eventId", "type": "bytes32"},
            {"indexed": False, "internalType": "bool", "name": "approved", "type": "bool"}
        ],
        "name": "EventRegistered",
        "type": "event"
    }
]

# For backwards compatibility with module imports
RPC_URL = get_rpc_url()
CONTRACT_ADDRESS = get_contract_address()
PRIVATE_KEY = get_private_key()

def get_w3():
    return Web3(Web3.HTTPProvider(get_rpc_url()))

w3 = get_w3()
contract = None
if CONTRACT_ADDRESS and w3.is_connected():
    try:
        contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI)
    except Exception as e:
        print(f"[WARN] Failed to instantiate contract with address '{CONTRACT_ADDRESS}': {e}")

def register_event(event_dict: dict) -> dict:
    """Call the smart contract to record a verified fire event.
    `event_dict` expects keys matching the contract signature.
    Returns a dict with tx hash and the emitted event ID.
    """
    addr = get_contract_address()
    if not addr:
        raise RuntimeError("Environment variable FI_CONTRACT_ADDRESS must be set to the deployed contract address")
    
    w3_conn = get_w3()
    if not w3_conn.is_connected():
        raise RuntimeError(f"Unable to connect to Web3 provider at {get_rpc_url()}")

    target_contract = w3_conn.eth.contract(address=Web3.to_checksum_address(addr), abi=ABI)
    pk = get_private_key()

    acct = w3_conn.eth.accounts[0]
    tx = target_contract.functions.registerEvent(
        event_dict["device_id"],
        event_dict.get("property_id", ""),
        int(event_dict["temperature"]),
        int(event_dict["smoke_level"]),
        bool(event_dict["flame_detected"]),
        bool(event_dict["verified"])
    ).build_transaction({
        "from": acct,
        "nonce": w3_conn.eth.get_transaction_count(acct),
        "gas": 3000000,
        "gasPrice": w3_conn.to_wei("1", "gwei")
    })
    signed = w3_conn.eth.account.sign_transaction(tx, private_key=pk)
    tx_hash = w3_conn.eth.send_raw_transaction(signed.rawTransaction)
    receipt = w3_conn.eth.wait_for_transaction_receipt(tx_hash)
    # Extract the event ID from the EventRegistered event
    try:
        logs = target_contract.events.EventRegistered().process_receipt(receipt)
        event_id = logs[0]["args"]["eventId"] if logs else None
    except ContractLogicError:
        event_id = None
    return {"tx_hash": tx_hash.hex(), "event_id": event_id, "receipt": dict(receipt)}

