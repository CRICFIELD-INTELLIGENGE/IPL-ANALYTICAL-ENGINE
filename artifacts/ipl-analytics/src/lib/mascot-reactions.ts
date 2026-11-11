/** Explicit catalog: no dependency on the device's emoji font. */
export const MASCOT_EMOJIS = ['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','🥹','☺️','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🫪','🤨','🧐','🤓','😎','🥸','🤩','🥳','🙂‍↕️','😏','😒','🙂‍↔️','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😮‍💨','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🫣','🫡','🤔','🫢','🤭','🤫','🤥','😶','😶‍🌫️','😐','😑','😬','🫨','🫠','🙄','😯','😦','😧','😮','😲','🥱','😴','🫩','🤤','😪','😵','😵‍💫','🫥','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠'] as const;
export type MascotEmoji = typeof MASCOT_EMOJIS[number];
export const MASCOT_REACTIONS = {
 idle: '🙂', loading: '🤔', analyzing: '🧐', login: '😉', authenticating: '🫣',
 success: '🥳', error: '😟', 'not-found': '😕', empty: '🥺', offline: '😶‍🌫️',
 commentary: '😃', wicket: '🤯', six: '🤩', boundary: '😎', dot: '😌',
 warning: '🤨', searching: '🧐', saving: '🤔', saved: '😁', analyst: '🤓',
} as const satisfies Record<string, MascotEmoji>;
export type MascotActivity = keyof typeof MASCOT_REACTIONS;
export function reactionForDelivery(ball: {isWicket?: boolean; runs?: number; isBoundary?: boolean}): MascotActivity {
 return ball.isWicket ? 'wicket' : ball.runs === 6 ? 'six' : ball.isBoundary ? 'boundary' : ball.runs === 0 ? 'dot' : 'commentary';
}
