import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const tradeReviewSchema = z.object({
  reviewWhatWentWell: optionalText(2000),
  reviewWhatWentWrong: optionalText(2000),
  reviewWhatToChange: optionalText(2000),
});
