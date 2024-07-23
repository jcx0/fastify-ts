import type { User } from "@/gen/types.gen";
import type { ResultAsync } from "neverthrow";
import { okAsync } from "neverthrow";

export async function create(params: {
  user: { birthday: string; email: string };
}): Promise<ResultAsync<User, string>> {
  return okAsync({
    birthday: params.user.birthday,
    email: params.user.email,
    id: "1",
  });
}
