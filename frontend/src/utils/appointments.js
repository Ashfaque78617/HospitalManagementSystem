// Mirrors the workflow enforced by the API (AppointmentService.Transitions).
export const NEXT = {
  Scheduled: ["Checked-In", "Cancelled", "No Show"],
  "Checked-In": ["Waiting", "In Consultation", "Cancelled"],
  Waiting: ["In Consultation", "Cancelled"],
  "In Consultation": ["Completed"],
};

export const FLOW = ["Scheduled", "Checked-In", "Waiting", "In Consultation", "Completed"];

// Label for the status-change button, named by what it does.
export const ACTION_LABEL = {
  "Checked-In": "Check in",
  Waiting: "Move to waiting",
  "In Consultation": "Start consultation",
  Completed: "Mark completed",
  Cancelled: "Cancel appointment",
  "No Show": "Mark no-show",
};

export const PRIMARY_ACTION = {
  Scheduled: "Checked-In",
  "Checked-In": "In Consultation",
  Waiting: "In Consultation",
  "In Consultation": "Completed",
};
