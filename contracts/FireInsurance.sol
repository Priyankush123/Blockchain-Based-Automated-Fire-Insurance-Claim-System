// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FireInsurance
 * @dev Simple contract that records verified fire events and evaluates a static policy.
 *      In a real system the policy would be stored on‑chain or referenced via an ID.
 */
contract FireInsurance {
    struct Event {
        uint256 timestamp;
        string deviceId;
        string propertyId;
        int256 temperature;
        uint256 smokeLevel;
        bool flameDetected;
        bool verified; // set by backend after rule/AI verification
    }

    mapping(bytes32 => Event) public events; // key = keccak256(deviceId, timestamp)
    event EventRegistered(bytes32 indexed eventId, bool approved);

    // Called by backend after it has verified the fire event.
    function registerEvent(
        string memory deviceId,
        string memory propertyId,
        int256 temperature,
        uint256 smokeLevel,
        bool flameDetected,
        bool verified
    ) external returns (bytes32) {
        uint256 ts = block.timestamp;
        bytes32 id = keccak256(abi.encodePacked(deviceId, ts));
        events[id] = Event({
            timestamp: ts,
            deviceId: deviceId,
            propertyId: propertyId,
            temperature: temperature,
            smokeLevel: smokeLevel,
            flameDetected: flameDetected,
            verified: verified
        });
        // Simple policy: approve if verified is true
        bool approved = verified;
        emit EventRegistered(id, approved);
        return id;
    }

    function getEvent(bytes32 id) external view returns (Event memory) {
        return events[id];
    }
}
