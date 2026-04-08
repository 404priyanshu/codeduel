export interface EditorPresenceUser {
  userId: string;
  name: string;
  role: "owner" | "participant";
  color: string;
}

export interface PresenceParticipant extends EditorPresenceUser {
  clientIds: number[];
  isSelf: boolean;
}

const PRESENCE_COLORS = [
  "#22c55e",
  "#38bdf8",
  "#f97316",
  "#eab308",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#f43f5e",
];

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getPresenceColor(seed: string) {
  return PRESENCE_COLORS[hashString(seed) % PRESENCE_COLORS.length];
}

export function getPresenceName(loginId?: string | null, username?: string | null) {
  if (loginId && loginId.trim().length > 0) {
    return loginId.trim();
  }

  if (username && username.trim().length > 0) {
    return username.trim();
  }

  return "Anonymous";
}
