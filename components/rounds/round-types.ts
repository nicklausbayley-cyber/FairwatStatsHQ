export type RoundHoleDetails = {
  id: string;
  holeNumber: number;
  par: number;
  handicap: number | null;
  score: number;
  putts: number | null;
  fir: boolean | null;
  gir: boolean;
  penalty: number | null;
};

export type RoundEventOption = {
  id: string;
  name: string;
  eventDate: string;
};

export type RoundDetailsData = {
  id: string;
  playerId: string;
  playerName: string;
  eventId: string | null;
  eventName: string | null;
  courseName: string | null;
  submittedByName: string | null;
  playedOn: string;
  holes: number;
  score: number;
  par: number | null;
  putts: number | null;
  fairwaysHit: number | null;
  fairwaysPossible: number | null;
  greensInRegulation: number | null;
  girPossible: number | null;
  penalties: number | null;
  threePutts: number | null;
  notes: string | null;
  createdAt: string;
  holeEntries: RoundHoleDetails[];
};
