/** Pure team-selection rules: the selected team must always be a current staff assignment. */
export type StaffTeamAssignment = {
  team_id: string;
  role: "admin" | "coach";
};

export function resolveStaffTeamId(
  assignments: StaffTeamAssignment[],
  homeTeamId: string,
  requestedTeamId: string | null | undefined
): string | null {
  if (requestedTeamId && assignments.some(({ team_id }) => team_id === requestedTeamId)) {
    return requestedTeamId;
  }
  if (assignments.some(({ team_id }) => team_id === homeTeamId)) {
    return homeTeamId;
  }
  return assignments[0]?.team_id ?? null;
}

export function canSwitchToTeam(
  assignments: StaffTeamAssignment[],
  teamId: string
): boolean {
  return assignments.some(({ team_id }) => team_id === teamId);
}
