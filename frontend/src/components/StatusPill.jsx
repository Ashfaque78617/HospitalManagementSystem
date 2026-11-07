const COLORS = {
  Scheduled: "blue", "Checked-In": "violet", Waiting: "amber", "In Consultation": "violet",
  Completed: "green", Cancelled: "grey", "No Show": "rose",
  Paid: "green", "Partially Paid": "amber", Unpaid: "rose",
  Active: "green", Inactive: "grey",
};

export default function StatusPill({ status }) {
  return <span className={`pill pill-${COLORS[status] ?? "grey"}`}>{status}</span>;
}
