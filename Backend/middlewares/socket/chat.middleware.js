import {
  validateIsInChat,
  validateGroupInfo,
  validateChatData,
} from "../../validations/chat.validations.js";

export const validateIsSocketInChat = async ({ userId, chatId }) => {
  try {
    await validateIsInChat({ userId, chatId });
  } catch (e) {
    console.log(e);
    throw new Error("Unauthorized");
  }
}

export const validateChat = async (data) => {
  try{
    await validateChatData(data);
  } catch (e) {
    throw new Error(e.message);
  }
}

export const validateGroupData = async (data) => {
  try {
    await validateGroupInfo(data.data);
    return data;
  } catch (e) {
    throw new Error(e.message);
  }
}
