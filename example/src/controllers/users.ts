import type { Controllers } from "@/gen/types.gen";
import { UserService } from "@/services";

export const createUser: Controllers["createUser"] = async (request, reply) => {
  const {
    body: { birthday, email },
  } = request;
  const result = await UserService.create({
    user: {
      birthday: birthday,
      email,
    },
  });
  if (result.isOk()) {
    reply.code(201).send({
      user: {
        id: 1,
        birthday: result.value.birthday,
        email2: result.value.email,
      },
    });
  } else if (result.error === "user/forbidden") {
    reply.code(402).send();
  } else if (result.error === "user/user-exists") {
    reply.code(409).send();
  } else {
    reply.code(500).send();
  }
  return reply;
};
