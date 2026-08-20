export const dashboardData = {
  project: {
    code: "PROJECT 001",
    title: "Founding Music Venture",
    phase: "Production",
    progress: 10,
  },

  actions: [
    {
      title: "Write verse for Beat 005",
      meta: "Track 005 · Due Friday",
      type: "Artist action",
      status: "In progress",
    },
    {
      title: "Approve contribution record",
      meta: "Track 003 · Due today",
      type: "Approval",
      status: "Review",
    },
    {
      title: "Studio session",
      meta: "Saturday · 2:00 PM",
      type: "Session",
      status: "Scheduled",
    },
    {
      title: "Complete split sheet",
      meta: "Track 006 · 2 signatures pending",
      type: "Rights",
      status: "Pending",
    },
  ],

  pipeline: [
    {
      name: "Beat 011",
      owner: "JJ",
      stage: "Available",
      artists: "4 interested",
    },
    {
      name: "Track 002",
      owner: "Gish / Monokid",
      stage: "Writing",
      artists: "Due Thu",
    },
    {
      name: "Track 004",
      owner: "Akatsa / G4",
      stage: "Recording",
      artists: "Session Sat",
    },
    {
      name: "Track 006",
      owner: "Steamy / Kena",
      stage: "Rights pending",
      artists: "2 signatures",
    },
  ],

  activity: [
    ["JJ", "added Beat 011 to the project", "18 min ago"],
    ["Akatsa", "registered interest in Beat 011", "34 min ago"],
    ["Project Lead", "moved Track 004 to Recording", "1 hr ago"],
    ["Gish", "completed a writing contribution on Track 002", "2 hrs ago"],
    ["Finance", "recorded KES 2,000 project expense", "4 hrs ago"],
  ] as [string, string, string][],
};