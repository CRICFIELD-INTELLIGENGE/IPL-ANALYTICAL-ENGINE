# Mascot reactions

Use CricFieldMascot inside the team provider. Franchise colors follow the selected team.

```tsx
<CricFieldMascot activity={isLoading ? 'analyzing' : error ? 'error' : 'success'} size={48} />
<CricFieldMascot emoji="🥹" size={48} />
<CricFieldLogo emoji="🤩" />
```

`emoji` overrides `activity`. Pass real page state to change a reaction. Existing `mood` callers still work. The logo keeps its automatic expression cycle when neither prop is provided.

The complete typed catalog is MASCOT_EMOJIS in lib/mascot-reactions.ts. MASCOT_REACTIONS lists named activities; reactionForDelivery prioritizes wicket, six, boundary, dot and normal commentary. Vector faces retain the cricket ball and seam. Related expressions share building blocks with distinguishing accessories. Blinking respects reduced motion.

Keep visible status text alongside reactions. Only signal a successful login or completed analysis after confirmation.
