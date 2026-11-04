export const DEFAULT_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const FIRE_INSURANCE_ABI = [
  "function registerStakeholder(address account, uint8 role) external",
  "function revokeStakeholder(address account, uint8 role) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function INSURER_ROLE() view returns (bytes32)",
  "function FIRE_OFFICER_ROLE() view returns (bytes32)",
  "function SURVEYOR_ROLE() view returns (bytes32)",
  "function CLAIMER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",

  "function registerPolicy(tuple(bytes32 policyReferenceHash, bytes32 propertyReferenceHash, bytes32 policyholderReferenceHash, bytes32 policyDocumentHash, bytes32 termsHash, uint256 sumInsured, uint256 deductible, uint256 startDate, uint256 endDate, bool fireCovered) input) returns (uint256)",
  "function verifyPolicy(uint256 policyId)",
  "function cancelPolicy(uint256 policyId)",
  "function isPolicyValidAt(uint256 policyId, uint256 incidentDate) view returns (bool)",
  "function getPolicy(uint256 policyId) view returns (tuple(uint256 policyId, bytes32 policyReferenceHash, bytes32 propertyReferenceHash, bytes32 policyholderReferenceHash, address insurer, bytes32 policyDocumentHash, bytes32 termsHash, uint256 sumInsured, uint256 deductible, uint256 startDate, uint256 endDate, uint256 cancelledAt, bool fireCovered, bool verified, bool exists))",

  "function lodgeComplaint(uint256 policyId) returns (uint256)",

  "function reportFire(uint256 policyId, uint256 incidentDate, bytes32 incidentReferenceHash) returns (uint256)",
  "function verifyIncident(uint256 incidentId, bytes32 fireReportHash)",
  "function getIncident(uint256 incidentId) view returns (tuple(uint256 incidentId, uint256 policyId, uint256 incidentDate, uint256 reportedAt, address reportedBy, bytes32 incidentReferenceHash, bytes32 fireReportHash, address verifiedBy, uint256 verifiedAt, bool verified, bool exists))",

  "function assignSurveyor(uint256 incidentId, address surveyor) returns (uint256)",
  "function submitAssessment(uint256 claimId, uint256 buildingLoss, uint256 contentsLoss, uint256 machineryLoss, uint256 salvageValue, bytes32 reportHash) returns (uint256)",
  "function approveClaim(uint256 claimId, uint256 approvedAmount)",
  "function rejectClaim(uint256 claimId, bytes32 reasonHash)",
  "function recordSettlement(uint256 claimId, uint256 settledAmount, bytes32 paymentReferenceHash)",
  "function getAssessment(uint256 assessmentId) view returns (tuple(uint256 assessmentId, uint256 claimId, address surveyor, uint256 buildingLoss, uint256 contentsLoss, uint256 machineryLoss, uint256 salvageValue, uint256 grossLoss, uint256 eligibleAmount, bytes32 reportHash, uint256 submittedAt, bool exists))",
  "function getClaim(uint256 claimId) view returns (tuple(uint256 claimId, uint256 policyId, uint256 incidentId, address claimant, address assignedSurveyor, uint256 assessmentId, uint256 approvedAmount, uint256 settledAmount, bytes32 rejectionReasonHash, bytes32 paymentReferenceHash, uint8 status, bool exists))",

  "function getTotalPolicies() view returns (uint256)",
  "function getTotalIncidents() view returns (uint256)",
  "function getTotalClaims() view returns (uint256)",
  "function getTotalAssessments() view returns (uint256)",

  "event StakeholderRegistered(address indexed account, bytes32 indexed role)",
  "event StakeholderRevoked(address indexed account, bytes32 indexed role)",
  "event PolicyRegistered(uint256 indexed policyId, address indexed insurer, bytes32 policyReferenceHash)",
  "event PolicyVerified(uint256 indexed policyId, address indexed insurer)",
  "event PolicyCancelled(uint256 indexed policyId, address indexed insurer, uint256 cancelledAt)",
  "event ComplaintLodged(uint256 indexed claimId, uint256 indexed policyId, address indexed claimer)",
  "event IncidentReported(uint256 indexed incidentId, uint256 indexed policyId, address indexed insurer, bytes32 incidentReferenceHash)",
  "event ClaimInitialized(uint256 indexed claimId, uint256 indexed incidentId, uint256 indexed policyId)",
  "event IncidentVerified(uint256 indexed incidentId, address indexed officer, bytes32 fireReportHash, uint256 verifiedAt)",
  "event SurveyorAssigned(uint256 indexed incidentId, uint256 indexed claimId, address indexed surveyor)",
  "event AssessmentSubmitted(uint256 indexed assessmentId, uint256 indexed claimId, address indexed surveyor, uint256 grossLoss, uint256 eligibleAmount, bytes32 reportHash)",
  "event ClaimApproved(uint256 indexed claimId, address indexed insurer, uint256 approvedAmount)",
  "event ClaimRejected(uint256 indexed claimId, address indexed insurer, bytes32 reasonHash)",
  "event ClaimSettled(uint256 indexed claimId, address indexed insurer, uint256 settledAmount, bytes32 paymentReferenceHash)"
];

export const CLAIM_STATUS_MAP: Record<number, string> = {
  0: "NONE",
  1: "COMPLAINT_LODGED",
  2: "INITIALIZED",
  3: "SUBMITTED",
  4: "ASSESSED",
  5: "APPROVED",
  6: "REJECTED",
  7: "SETTLED"
};

export const COMPLAINT_STATUS_MAP: Record<number, string> = {
  0: "NONE",
  1: "COMPLAINT_LODGED",
  2: "INITIALIZED",
  3: "REJECTED"
};

export const ROLE_ENUM = {
  INSURER: 0,
  FIRE_OFFICER: 1,
  SURVEYOR: 2,
  CLAIMER: 3
} as const;
