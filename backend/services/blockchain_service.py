'''Blockchain interaction utilities using web3.py'''

import os
import json
from pathlib import Path
from web3 import Web3
from web3.exceptions import ContractLogicError
from backend.config import settings

# Read from settings (loaded from .env)
RPC_URL = settings.web3_rpc_url
CONTRACT_ADDRESS = settings.fi_contract_address
PRIVATE_KEY = settings.fi_private_key
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

if not CONTRACT_ADDRESS:
    raise RuntimeError("Environment variable FI_CONTRACT_ADDRESS must be set to the deployed contract address")

w3 = Web3(Web3.HTTPProvider(RPC_URL))
if not w3.is_connected():
    raise RuntimeError(f"Unable to connect to Web3 provider at {RPC_URL}")

contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI)

def register_event(event_dict: dict) -> dict:
    """Call the smart contract to record a verified fire event.
    `event_dict` expects keys matching the contract signature.
    Returns a dict with tx hash and the emitted event ID.
    """
    # Assume the first account is used for signing – in a real setup you would manage keys securely.
    acct = w3.eth.accounts[0]
    tx = contract.functions.registerEvent(
        event_dict["device_id"],
        event_dict.get("property_id", ""),
        int(event_dict["temperature"]),
        int(event_dict["smoke_level"]),
        bool(event_dict["flame_detected"]),
        bool(event_dict["verified"])
    ).build_transaction({
        "from": acct,
        "nonce": w3.eth.get_transaction_count(acct),
        "gas": 3000000,
        "gasPrice": w3.to_wei("1", "gwei")
    })
    signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    raw_tx = getattr(signed, "raw_transaction", None) or getattr(signed, "rawTransaction", None)
    tx_hash = w3.eth.send_raw_transaction(raw_tx)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    # Extract the event ID from the EventRegistered event
    try:
        logs = contract.events.EventRegistered().process_receipt(receipt)
        raw_event_id = logs[0]["args"]["eventId"] if logs else None
        if hasattr(raw_event_id, "hex"):
            event_id = "0x" + raw_event_id.hex() if not str(raw_event_id).startswith("0x") else str(raw_event_id)
        elif isinstance(raw_event_id, bytes):
            event_id = "0x" + raw_event_id.hex()
        else:
            event_id = raw_event_id
    except ContractLogicError:
        event_id = None
    tx_hash_hex = tx_hash.hex() if hasattr(tx_hash, "hex") else str(tx_hash)
    if not tx_hash_hex.startswith("0x"):
        tx_hash_hex = "0x" + tx_hash_hex
    return {"tx_hash": tx_hash_hex, "event_id": event_id, "receipt": json.loads(Web3.to_json(receipt))}
