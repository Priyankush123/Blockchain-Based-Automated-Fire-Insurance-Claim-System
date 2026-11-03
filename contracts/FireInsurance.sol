// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

<<<<<<< HEAD
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * FireChain academic prototype.
 * Original documents remain in the insurer's local document folder.
 * Only SHA-256 document fingerprints and workflow records are stored on-chain.
 * Settlement is recorded as an off-chain payment attestation; this contract
 * does not transfer INR or ETH.
 */
contract FireInsurance is AccessControl {
    bytes32 public constant INSURER_ROLE = keccak256("INSURER_ROLE");
    bytes32 public constant FIRE_OFFICER_ROLE = keccak256("FIRE_OFFICER_ROLE");
    bytes32 public constant SURVEYOR_ROLE = keccak256("SURVEYOR_ROLE");

    enum StakeholderRole { INSURER, FIRE_OFFICER, SURVEYOR }

    enum ClaimStatus {
        NONE,
        SUBMITTED,
        ASSESSED,
        APPROVED,
        REJECTED,
        SETTLED
    }

    struct Policy {
        uint256 policyId;
        bytes32 policyReferenceHash;
        bytes32 propertyReferenceHash;
        bytes32 policyholderReferenceHash;
        address insurer;
        bytes32 policyDocumentHash;
        bytes32 termsHash;
        uint256 sumInsured;       // INR paise
        uint256 deductible;       // INR paise
        uint256 startDate;        // Unix timestamp
        uint256 endDate;          // Unix timestamp
        uint256 cancelledAt;      // 0 means not cancelled
        bool fireCovered;
        bool verified;
        bool exists;
    }

    struct PolicyInput {
        bytes32 policyReferenceHash;
        bytes32 propertyReferenceHash;
        bytes32 policyholderReferenceHash;
        bytes32 policyDocumentHash;
        bytes32 termsHash;
        uint256 sumInsured;
        uint256 deductible;
        uint256 startDate;
        uint256 endDate;
        bool fireCovered;
    }

    struct Incident {
        uint256 incidentId;
        uint256 policyId;
        uint256 incidentDate;
        uint256 reportedAt;
        address reportedBy;
        bytes32 incidentReferenceHash;
        bytes32 evidenceHash;
        bytes32 fireReportHash;
        address verifiedBy;
        uint256 verifiedAt;
        bool verified;
        bool exists;
    }

    struct Assessment {
        uint256 assessmentId;
        uint256 claimId;
        address surveyor;
        uint256 buildingLoss;      // INR paise
        uint256 contentsLoss;      // INR paise
        uint256 machineryLoss;     // INR paise
        uint256 salvageValue;      // INR paise
        uint256 grossLoss;         // INR paise, after salvage
        uint256 eligibleAmount;    // INR paise, after deductible
        bytes32 reportHash;
        uint256 submittedAt;
        bool exists;
    }

    struct Claim {
        uint256 claimId;
        uint256 policyId;
        uint256 incidentId;
        address claimantAgent;     // insurer wallet submitting for policyholder
        address assignedSurveyor;
        uint256 assessmentId;
        uint256 approvedAmount;    // INR paise
        uint256 settledAmount;     // INR paise
        bytes32 rejectionReasonHash;
        bytes32 paymentReferenceHash;
        ClaimStatus status;
        bool exists;
    }

    mapping(uint256 => Policy) private policies;
    mapping(uint256 => Incident) private incidents;
    mapping(uint256 => Assessment) private assessments;
    mapping(uint256 => Claim) private claims;

    mapping(bytes32 => bool) public registeredPolicyReferences;
    mapping(bytes32 => bool) public registeredIncidentReferences;
    mapping(uint256 => uint256) public incidentToClaimId;

    uint256 public policyCount;
    uint256 public incidentCount;
    uint256 public assessmentCount;
    uint256 public claimCount;

    event StakeholderRegistered(address indexed account, bytes32 indexed role);
    event StakeholderRevoked(address indexed account, bytes32 indexed role);
    event PolicyRegistered(uint256 indexed policyId, address indexed insurer, bytes32 policyReferenceHash);
    event PolicyVerified(uint256 indexed policyId, address indexed insurer);
    event PolicyCancelled(uint256 indexed policyId, address indexed insurer, uint256 cancelledAt);
    event IncidentReported(uint256 indexed incidentId, uint256 indexed policyId, address indexed insurer, bytes32 incidentReferenceHash, bytes32 evidenceHash);
    event IncidentVerified(uint256 indexed incidentId, address indexed officer, bytes32 fireReportHash, uint256 verifiedAt);
    event SurveyorAssigned(uint256 indexed incidentId, uint256 indexed claimId, address indexed surveyor);
    event ClaimCreated(uint256 indexed claimId, uint256 indexed incidentId, uint256 indexed policyId);
    event AssessmentSubmitted(uint256 indexed assessmentId, uint256 indexed claimId, address indexed surveyor, uint256 grossLoss, uint256 eligibleAmount, bytes32 reportHash);
    event ClaimApproved(uint256 indexed claimId, address indexed insurer, uint256 approvedAmount);
    event ClaimRejected(uint256 indexed claimId, address indexed insurer, bytes32 reasonHash);
    event ClaimSettled(uint256 indexed claimId, address indexed insurer, uint256 settledAmount, bytes32 paymentReferenceHash);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ---------- Stakeholder administration ----------

    function registerStakeholder(address account, StakeholderRole role)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(account != address(0), "Invalid address");
        bytes32 roleId = _roleId(role);
        require(!hasRole(roleId, account), "Role already assigned");
        _grantRole(roleId, account);
        emit StakeholderRegistered(account, roleId);
    }

    function revokeStakeholder(address account, StakeholderRole role)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        bytes32 roleId = _roleId(role);
        require(hasRole(roleId, account), "Stakeholder not registered");
        _revokeRole(roleId, account);
        emit StakeholderRevoked(account, roleId);
    }

    function _roleId(StakeholderRole role) internal pure returns (bytes32) {
        if (role == StakeholderRole.INSURER) return INSURER_ROLE;
        if (role == StakeholderRole.FIRE_OFFICER) return FIRE_OFFICER_ROLE;
        return SURVEYOR_ROLE;
    }

    // ---------- Policy lifecycle ----------

    function registerPolicy(PolicyInput calldata input)
        external onlyRole(INSURER_ROLE) returns (uint256)
    {
        require(input.policyReferenceHash != bytes32(0), "Invalid policy reference");
        require(input.propertyReferenceHash != bytes32(0), "Invalid property reference");
        require(input.policyDocumentHash != bytes32(0), "Invalid document hash");
        require(input.termsHash != bytes32(0), "Invalid terms hash");
        require(input.sumInsured > 0, "Invalid sum insured");
        require(input.deductible <= input.sumInsured, "Invalid deductible");
        require(input.endDate > input.startDate, "Invalid policy period");
        require(!registeredPolicyReferences[input.policyReferenceHash], "Policy already registered");

        policyCount++;
        Policy storage p = policies[policyCount];
        p.policyId = policyCount;
        p.policyReferenceHash = input.policyReferenceHash;
        p.propertyReferenceHash = input.propertyReferenceHash;
        p.policyholderReferenceHash = input.policyholderReferenceHash;
        p.insurer = msg.sender;
        p.policyDocumentHash = input.policyDocumentHash;
        p.termsHash = input.termsHash;
        p.sumInsured = input.sumInsured;
        p.deductible = input.deductible;
        p.startDate = input.startDate;
        p.endDate = input.endDate;
        p.fireCovered = input.fireCovered;
        p.verified = false;
        p.exists = true;

        registeredPolicyReferences[input.policyReferenceHash] = true;
        emit PolicyRegistered(policyCount, msg.sender, input.policyReferenceHash);
        return policyCount;
    }

    function verifyPolicy(uint256 policyId) external onlyRole(INSURER_ROLE) {
        Policy storage p = policies[policyId];
        require(p.exists, "Policy does not exist");
        require(p.insurer == msg.sender, "Not the policy insurer");
        require(!p.verified, "Policy already verified");
        require(p.cancelledAt == 0, "Policy already cancelled");
        p.verified = true;
        emit PolicyVerified(policyId, msg.sender);
    }

    function cancelPolicy(uint256 policyId) external onlyRole(INSURER_ROLE) {
        Policy storage p = policies[policyId];
        require(p.exists, "Policy does not exist");
        require(p.insurer == msg.sender, "Not the policy insurer");
        require(p.verified, "Policy not verified");
        require(p.cancelledAt == 0, "Policy already cancelled");
        p.cancelledAt = block.timestamp;
        // Keep verified=true to preserve the historical verification record.
        emit PolicyCancelled(policyId, msg.sender, block.timestamp);
    }

    function isPolicyValidAt(uint256 policyId, uint256 incidentDate)
        public view returns (bool)
    {
        Policy storage p = policies[policyId];
        if (!p.exists || !p.verified || !p.fireCovered) return false;
        if (incidentDate < p.startDate || incidentDate > p.endDate) return false;
        if (p.cancelledAt != 0 && incidentDate >= p.cancelledAt) return false;
        return true;
    }

    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        require(policies[policyId].exists, "Policy does not exist");
        return policies[policyId];
    }

    // ---------- Fire incident lifecycle ----------

    function reportFire(
        uint256 policyId,
        uint256 incidentDate,
        bytes32 incidentReferenceHash,
        bytes32 evidenceHash
    ) external onlyRole(INSURER_ROLE) returns (uint256) {
        Policy storage p = policies[policyId];
        require(p.exists, "Policy does not exist");
        require(p.insurer == msg.sender, "Not the policy insurer");
        require(incidentReferenceHash != bytes32(0), "Invalid incident reference");
        require(evidenceHash != bytes32(0), "Invalid evidence hash");
        require(!registeredIncidentReferences[incidentReferenceHash], "Incident already registered");
        require(incidentDate <= block.timestamp, "Future incident date");
        require(isPolicyValidAt(policyId, incidentDate), "Policy not valid on incident date");

        incidentCount++;
        Incident storage i = incidents[incidentCount];
        i.incidentId = incidentCount;
        i.policyId = policyId;
        i.incidentDate = incidentDate;
        i.reportedAt = block.timestamp;
        i.reportedBy = msg.sender;
        i.incidentReferenceHash = incidentReferenceHash;
        i.evidenceHash = evidenceHash;
        i.exists = true;

        registeredIncidentReferences[incidentReferenceHash] = true;
        emit IncidentReported(incidentCount, policyId, msg.sender, incidentReferenceHash, evidenceHash);
        return incidentCount;
    }

    function verifyIncident(uint256 incidentId, bytes32 fireReportHash)
        external onlyRole(FIRE_OFFICER_ROLE)
    {
        Incident storage i = incidents[incidentId];
        require(i.exists, "Incident does not exist");
        require(!i.verified, "Incident already verified");
        require(fireReportHash != bytes32(0), "Invalid fire report hash");

        i.fireReportHash = fireReportHash;
        i.verifiedBy = msg.sender;
        i.verifiedAt = block.timestamp;
        i.verified = true;
        emit IncidentVerified(incidentId, msg.sender, fireReportHash, block.timestamp);
    }

    function getIncident(uint256 incidentId) external view returns (Incident memory) {
        require(incidents[incidentId].exists, "Incident does not exist");
        return incidents[incidentId];
    }

    // ---------- Surveyor and claim lifecycle ----------

    function assignSurveyor(uint256 incidentId, address surveyor)
        external onlyRole(INSURER_ROLE) returns (uint256)
    {
        Incident storage i = incidents[incidentId];
        require(i.exists, "Incident does not exist");
        require(i.verified, "Incident not verified");
        Policy storage p = policies[i.policyId];
        require(p.insurer == msg.sender, "Not the policy insurer");
        require(hasRole(SURVEYOR_ROLE, surveyor), "Not an authorised surveyor");
        require(incidentToClaimId[incidentId] == 0, "Claim already created");

        claimCount++;
        Claim storage c = claims[claimCount];
        c.claimId = claimCount;
        c.policyId = i.policyId;
        c.incidentId = incidentId;
        c.claimantAgent = msg.sender;
        c.assignedSurveyor = surveyor;
        c.status = ClaimStatus.SUBMITTED;
        c.exists = true;

        incidentToClaimId[incidentId] = claimCount;
        emit SurveyorAssigned(incidentId, claimCount, surveyor);
        emit ClaimCreated(claimCount, incidentId, i.policyId);
        return claimCount;
    }

    function submitAssessment(
        uint256 claimId,
        uint256 buildingLoss,
        uint256 contentsLoss,
        uint256 machineryLoss,
        uint256 salvageValue,
        bytes32 reportHash
    ) external onlyRole(SURVEYOR_ROLE) returns (uint256) {
        Claim storage c = claims[claimId];
        require(c.exists, "Claim does not exist");
        require(c.status == ClaimStatus.SUBMITTED, "Claim not awaiting assessment");
        require(c.assignedSurveyor == msg.sender, "Not the assigned surveyor");
        require(reportHash != bytes32(0), "Invalid assessment hash");

        uint256 totalLoss = buildingLoss + contentsLoss + machineryLoss;
        require(salvageValue <= totalLoss, "Salvage exceeds total loss");
        uint256 grossLoss = totalLoss - salvageValue;
        Policy storage p = policies[c.policyId];
        uint256 eligible = grossLoss > p.deductible ? grossLoss - p.deductible : 0;
        if (eligible > p.sumInsured) eligible = p.sumInsured;

        assessmentCount++;
        Assessment storage a = assessments[assessmentCount];
        a.assessmentId = assessmentCount;
        a.claimId = claimId;
        a.surveyor = msg.sender;
        a.buildingLoss = buildingLoss;
        a.contentsLoss = contentsLoss;
        a.machineryLoss = machineryLoss;
        a.salvageValue = salvageValue;
        a.grossLoss = grossLoss;
        a.eligibleAmount = eligible;
        a.reportHash = reportHash;
        a.submittedAt = block.timestamp;
        a.exists = true;

        c.assessmentId = assessmentCount;
        c.status = ClaimStatus.ASSESSED;
        emit AssessmentSubmitted(assessmentCount, claimId, msg.sender, grossLoss, eligible, reportHash);
        return assessmentCount;
    }

    function approveClaim(uint256 claimId, uint256 approvedAmount)
        external onlyRole(INSURER_ROLE)
    {
        Claim storage c = claims[claimId];
        require(c.exists, "Claim does not exist");
        require(c.status == ClaimStatus.ASSESSED, "Claim not assessed");
        Policy storage p = policies[c.policyId];
        require(p.insurer == msg.sender, "Not the policy insurer");

        require(c.assessmentId != 0, "Assessment not found");
        uint256 maximum = assessments[c.assessmentId].eligibleAmount;
        require(approvedAmount > 0, "Invalid approval amount");
        require(approvedAmount <= maximum, "Amount exceeds eligible loss");

        c.approvedAmount = approvedAmount;
        c.status = ClaimStatus.APPROVED;
        emit ClaimApproved(claimId, msg.sender, approvedAmount);
    }

    function rejectClaim(uint256 claimId, bytes32 reasonHash)
        external onlyRole(INSURER_ROLE)
    {
        Claim storage c = claims[claimId];
        require(c.exists, "Claim does not exist");
        require(
            c.status == ClaimStatus.SUBMITTED || c.status == ClaimStatus.ASSESSED,
            "Claim cannot be rejected"
        );
        Policy storage p = policies[c.policyId];
        require(p.insurer == msg.sender, "Not the policy insurer");
        require(reasonHash != bytes32(0), "Invalid rejection reason hash");

        c.rejectionReasonHash = reasonHash;
        c.status = ClaimStatus.REJECTED;
        emit ClaimRejected(claimId, msg.sender, reasonHash);
    }

    function recordSettlement(
        uint256 claimId,
        uint256 settledAmount,
        bytes32 paymentReferenceHash
    ) external onlyRole(INSURER_ROLE) {
        Claim storage c = claims[claimId];
        require(c.exists, "Claim does not exist");
        require(c.status == ClaimStatus.APPROVED, "Claim not approved");
        Policy storage p = policies[c.policyId];
        require(p.insurer == msg.sender, "Not the policy insurer");
        require(settledAmount == c.approvedAmount, "Settlement must match approval");
        require(paymentReferenceHash != bytes32(0), "Invalid payment reference hash");

        c.settledAmount = settledAmount;
        c.paymentReferenceHash = paymentReferenceHash;
        c.status = ClaimStatus.SETTLED;
        emit ClaimSettled(claimId, msg.sender, settledAmount, paymentReferenceHash);
    }

    function getAssessment(uint256 assessmentId) external view returns (Assessment memory) {
        require(assessments[assessmentId].exists, "Assessment does not exist");
        return assessments[assessmentId];
    }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        require(claims[claimId].exists, "Claim does not exist");
        return claims[claimId];
    }

    function getTotalPolicies() external view returns (uint256) { return policyCount; }
    function getTotalIncidents() external view returns (uint256) { return incidentCount; }
    function getTotalClaims() external view returns (uint256) { return claimCount; }
    function getTotalAssessments() external view returns (uint256) { return assessmentCount; }
=======
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
>>>>>>> 72c00741ff8a425676ac953906d996037488592b
}
