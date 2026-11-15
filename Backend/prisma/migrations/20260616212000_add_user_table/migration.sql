/*
  Warnings:

  - You are about to drop the column `chatid` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `deleted` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `deleted` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[lastMessageId]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chatId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_chatid_fkey";

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastMessageId" INTEGER;

-- AlterTable
ALTER TABLE "ChatParticipant" ADD COLUMN     "unreadCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "chatid",
DROP COLUMN "deleted",
ADD COLUMN     "chatId" INTEGER NOT NULL,
ADD COLUMN     "globalStatus" "MessageStatusEnum" NOT NULL DEFAULT 'SENT';

-- AlterTable
ALTER TABLE "MessageStatus" ALTER COLUMN "status" SET DEFAULT 'SENT';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "deleted",
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BlockedUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "blockedUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedUser_userId_blockedUserId_key" ON "BlockedUser"("userId", "blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Chat_lastMessageId_key" ON "Chat"("lastMessageId");

-- AddForeignKey
ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_lastMessageId_fkey" FOREIGN KEY ("lastMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
