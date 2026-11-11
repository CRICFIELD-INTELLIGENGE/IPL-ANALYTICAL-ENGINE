// All slot templates, in plan order.
import { BATTING } from "./slots/batting";
import { BOWLING } from "./slots/bowling";
import { TACTICAL } from "./slots/tactical";
import { AUCTION } from "./slots/auction";
import { BUSINESS } from "./slots/business";
import { FAN } from "./slots/fan";
import { HISTORY } from "./slots/history";
import { SCOUTING } from "./slots/scouting";
import { DATASCI } from "./slots/datasci";
import { FUTURE } from "./slots/future";
import type { SlotSpec } from "./slots/types";

export const SLOTS: SlotSpec[] = [...BATTING, ...BOWLING, ...TACTICAL, ...AUCTION, ...BUSINESS, ...FAN, ...HISTORY, ...SCOUTING, ...DATASCI, ...FUTURE];
