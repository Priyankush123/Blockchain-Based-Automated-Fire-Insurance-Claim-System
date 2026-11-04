// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FireInsurance
 * @notice Enterprise-grade decentralized fire insurance claims protocol.
 * @dev Manages policy underwriting, complaint lodging, fire incident verification,
 * loss assessments, claim approvals, and off-chain fiat settlement attestations.
 * Sensitive documents remain off-chain; cryptographic 32-byte hashes are recorded on-chain.
 */
contract FireInsurance is AccessControl {
    // ---------------------------------------------------------------
    // 1. Roles & Access Control
    // ---------------------------------------------------------------
    bytes32 public constant INSURER_ROLE = keccak256("INSURER_ROLE");
    bytes32 public constant FIRE_OFFICER_ROLE = keccak256("FIRE_OFFICER_ROLE");
    bytes32 public constant SURVEYOR_ROLE = keccak256("SURVEYOR_ROLE");
    bytes32 public constant CLAIMER_ROLE = keccak256("CLAIMER_ROLE");

    enum StakeholderRole {
        INSURER,
        FIRE_OFFICER,
        SURVEYOR,
        CLAIMER
    }

    // ---------------------------------------------------------------
    // 2. State Machine & Structs
    // ---------------------------------------------------------------
    enum ClaimStatus {
        NONE,
        COMPLAINT_LODGED,
        INITIALIZED,
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
        uint256 cancelledAt;      // 0 means active
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
        uint256 incidentDate;     // Unix timestamp
        uint256 reportedAt;       // Unix timestamp
        address reportedBy;
        bytes32 incidentReferenceHash;
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
        uint256 eligibleAmount;    // INR paise, bounded by deductible and sumInsured
        bytes32 reportHash;
        uint256 submittedAt;
        bool exists;
    }

    struct Claim {
        uint256 claimId;
        uint256 policyId;
        uint256 incidentId;
        address claimant;
        address assignedSurveyor;
        uint256 assessmentId;
        uint256 approvedAmount;    // INR paise
        uint256 settledAmount;     // INR paise
        bytes32 rejectionReasonHash;
        bytes32 paymentReferenceHash;
        ClaimStatus status;
        bool exists;
    }

    // ---------------------------------------------------------------
    // Storage & Counters
    // ---------------------------------------------------------------
    uint256 public policyCount;
    uint256 public incidentCount;
    uint256 public claimCount;
    uint256 public assessmentCount;

    mapping(uint256 => Policy) private policies;
    mapping(uint256 => Incident) private incidents;
    mapping(uint256 => Assessment) private assessments;
    mapping(uint256 => Claim) private claims;

    mapping(bytes32 => bool) public registeredPolicyReferences;
    mapping(bytes32 => bool) public registeredIncidentReferences;
    mapping(uint256 => uint256) public incidentToClaimId;
    mapping(uint256 => uint256) public policyToActiveClaimId;

    // ---------------------------------------------------------------
    // 4. Events
    // ---------------------------------------------------------------
    event StakeholderRegistered(address indexed account, bytes32 indexed role);
    event StakeholderRevoked(address indexed account, bytes32 indexed role);

    event PolicyRegistered(uint256 indexed policyId, address indexed insurer, bytes32 policyReferenceHash);
    event PolicyVerified(uint256 indexed policyId, address indexed insurer);
    event PolicyCancelled(uint256 indexed policyId, address indexed insurer, uint256 cancelledAt);

    event ComplaintLodged(uint256 indexed claimId, uint256 indexed policyId, address indexed claimer);
    event IncidentReported(uint256 indexed incidentId, uint256 indexed policyId, address indexed insurer, bytes32 incidentReferenceHash);
    event ClaimInitialized(uint256 indexed claimId, uint256 indexed incidentId, uint256 indexed policyId);
    event IncidentVerified(uint256 indexed incidentId, address indexed officer, bytes32 fireReportHash, uint256 verifiedAt);

    event SurveyorAssigned(uint256 indexed incidentId, uint256 indexed claimId, address indexed surveyor);
    event AssessmentSubmitted(uint256 indexed assessmentId, uint256 indexed claimId, address indexed surveyor, uint256 grossLoss, uint256 eligibleAmount, bytes32 reportHash);
    event ClaimApproved(uint256 indexed claimId, address indexed insurer, uint256 approvedAmount);
    event ClaimRejected(uint256 indexed claimId, address indexed insurer, bytes32 reasonHash);
    event ClaimSettled(uint256 indexed claimId, address indexed insurer, uint256 settledAmount, bytes32 paymentReferenceHash);

    // ---------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ---------------------------------------------------------------
    // Stakeholder Administration
    // ---------------------------------------------------------------
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
        if (role == StakeholderRole.SURVEYOR) return SURVEYOR_ROLE;
        if (role == StakeholderRole.CLAIMER) return CLAIMER_ROLE;
        revert("Unknown role");
    }

    // ---------------------------------------------------------------
    // 3. Core Workflow Functions
    // ---------------------------------------------------------------

    /**
     * @notice Insurer registers a new fire insurance policy.
     */
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
        p.verified = true;
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

    /**
     * @notice Claimer lodges a preliminary complaint. Sets status to COMPLAINT_LODGED.
     */
    function lodgeComplaint(uint256 policyId)
        external onlyRole(CLAIMER_ROLE) returns (uint256)
    {
        Policy storage p = policies[policyId];
        require(p.exists, "Policy does not exist");
        // require(p.verified, "Policy not verified");
        require(p.cancelledAt == 0, "Policy is cancelled");
        require(policyToActiveClaimId[policyId] == 0, "An active claim already exists for this policy");

        claimCount++;
        uint256 id = claimCount;
        claims[id] = Claim({
            claimId: id,
            policyId: policyId,
            incidentId: 0,
            claimant: msg.sender,
            assignedSurveyor: address(0),
            assessmentId: 0,
            approvedAmount: 0,
            settledAmount: 0,
            rejectionReasonHash: bytes32(0),
            paymentReferenceHash: bytes32(0),
            status: ClaimStatus.COMPLAINT_LODGED,
            exists: true
        });

        policyToActiveClaimId[policyId] = id;
        emit ComplaintLodged(id, policyId, msg.sender);
        return id;
    }

    /**
     * @notice Insurer formalizes the Claimer's complaint into an active incident.
     */
    function reportFire(
        uint256 policyId,
        uint256 incidentDate,
        bytes32 incidentReferenceHash
    ) external onlyRole(INSURER_ROLE) returns (uint256) {
        Policy storage p = policies[policyId];
        require(p.exists, "Policy does not exist");
        require(p.insurer == msg.sender, "Not the policy insurer");
        require(incidentReferenceHash != bytes32(0), "Invalid incident reference");
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
        i.exists = true;

        registeredIncidentReferences[incidentReferenceHash] = true;

        uint256 cId = policyToActiveClaimId[policyId];
        if (cId != 0 && claims[cId].status == ClaimStatus.COMPLAINT_LODGED) {
            claims[cId].incidentId = incidentCount;
            claims[cId].status = ClaimStatus.INITIALIZED;
            incidentToClaimId[incidentCount] = cId;
        } else {
            claimCount++;
            cId = claimCount;
            claims[cId] = Claim({
                claimId: cId,
                policyId: policyId,
                incidentId: incidentCount,
                claimant: address(0),
                assignedSurveyor: address(0),
                assessmentId: 0,
                approvedAmount: 0,
                settledAmount: 0,
                rejectionReasonHash: bytes32(0),
                paymentReferenceHash: bytes32(0),
                status: ClaimStatus.INITIALIZED,
                exists: true
            });
            incidentToClaimId[incidentCount] = cId;
        }

        emit IncidentReported(incidentCount, policyId, msg.sender, incidentReferenceHash);
        emit ClaimInitialized(cId, incidentCount, policyId);
        return incidentCount;
    }

    /**
     * @notice Fire Officer uploads the official fire report hash.
     */
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

    /**
     * @notice Insurer assigns a specific Surveyor wallet to the incident, changing status to SUBMITTED.
     */
    function assignSurveyor(uint256 incidentId, address surveyor)
        external onlyRole(INSURER_ROLE) returns (uint256)
    {
        Incident storage i = incidents[incidentId];
        require(i.exists, "Incident does not exist");
        require(i.verified, "Incident not verified");
        Policy storage p = policies[i.policyId];
        require(p.insurer == msg.sender, "Not the policy insurer");
        require(hasRole(SURVEYOR_ROLE, surveyor), "Not an authorised surveyor");

        uint256 cId = incidentToClaimId[incidentId];
        require(cId != 0, "Claim not found");
        Claim storage c = claims[cId];
        require(
            c.status == ClaimStatus.INITIALIZED || c.status == ClaimStatus.COMPLAINT_LODGED,
            "Claim not ready for surveyor"
        );

        c.assignedSurveyor = surveyor;
        c.status = ClaimStatus.SUBMITTED;

        emit SurveyorAssigned(incidentId, cId, surveyor);
        return cId;
    }

    /**
     * @notice Surveyor uploads integer loss breakdowns with strict math guardrails.
     */
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

        // Strict Math Guardrails Required:
        uint256 totalLoss = buildingLoss + contentsLoss + machineryLoss;
        require(salvageValue <= totalLoss, "Salvage exceeds total loss");
        uint256 grossLoss = totalLoss - salvageValue;

        Policy storage p = policies[c.policyId];
        uint256 eligible = grossLoss > p.deductible ? grossLoss - p.deductible : 0;
        if (eligible > p.sumInsured) {
            eligible = p.sumInsured;
        }

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

    /**
     * @notice Insurer approves the claim up to the eligible assessment bound.
     */
    function approveClaim(uint256 claimId, uint256 approvedAmount)
        external onlyRole(INSURER_ROLE)
    {
        Claim storage c = claims[claimId];
        require(c.exists, "Claim does not exist");
        require(c.status == ClaimStatus.ASSESSED, "Claim not assessed");
        Policy storage p = policies[c.policyId];
        require(p.insurer == msg.sender, "Not the policy insurer");

        require(c.assessmentId != 0, "Assessment not found");
        uint256 eligible = assessments[c.assessmentId].eligibleAmount;
        require(approvedAmount > 0, "Invalid approval amount");
        require(approvedAmount <= eligible, "Amount exceeds eligible loss");

        c.approvedAmount = approvedAmount;
        c.status = ClaimStatus.APPROVED;

        emit ClaimApproved(claimId, msg.sender, approvedAmount);
    }

    /**
     * @notice Insurer rejects the claim with a tamper-evident reason hash.
     */
    function rejectClaim(uint256 claimId, bytes32 reasonHash)
        external onlyRole(INSURER_ROLE)
    {
        Claim storage c = claims[claimId];
        require(c.exists, "Claim does not exist");
        require(
            c.status == ClaimStatus.COMPLAINT_LODGED ||
            c.status == ClaimStatus.INITIALIZED ||
            c.status == ClaimStatus.SUBMITTED ||
            c.status == ClaimStatus.ASSESSED,
            "Claim cannot be rejected"
        );
        Policy storage p = policies[c.policyId];
        require(p.insurer == msg.sender, "Not the policy insurer");
        require(reasonHash != bytes32(0), "Invalid rejection reason hash");

        c.rejectionReasonHash = reasonHash;
        c.status = ClaimStatus.REJECTED;

        emit ClaimRejected(claimId, msg.sender, reasonHash);
    }

    /**
     * @notice Insurer records off-chain fiat settlement attestation with bank reference hash.
     */
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

    // ---------------------------------------------------------------
    // View Getters
    // ---------------------------------------------------------------
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        require(policies[policyId].exists, "Policy does not exist");
        return policies[policyId];
    }

    function getIncident(uint256 incidentId) external view returns (Incident memory) {
        require(incidents[incidentId].exists, "Incident does not exist");
        return incidents[incidentId];
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
}
