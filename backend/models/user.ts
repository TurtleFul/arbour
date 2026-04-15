import jwt from "jsonwebtoken";
import { getDb } from "../db/index";
import { user as userTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { generatePasswordHash, shake256, SHAKE256_LENGTH } from "../password-hash";

export type UserRow = typeof userTable.$inferSelect;

export class User {
    id: number;
    username: string;
    password: string;
    active: boolean;
    timezone: string | null;
    twofa_secret: string | null;
    twofa_status: boolean;
    twofa_last_token: string | null;

    constructor(row: UserRow) {
        this.id = row.id;
        this.username = row.username;
        this.password = row.password ?? "";
        this.active = row.active;
        this.timezone = row.timezone ?? null;
        this.twofa_secret = row.twofa_secret ?? null;
        this.twofa_status = row.twofa_status;
        this.twofa_last_token = row.twofa_last_token ?? null;
    }

    static fromRow(row: UserRow): User {
        return new User(row);
    }

    static async resetPassword(userID: number, newPassword: string) {
        getDb().update(userTable)
            .set({ password: generatePasswordHash(newPassword) })
            .where(eq(userTable.id, userID))
            .run();
    }

    async resetPassword(newPassword: string) {
        await User.resetPassword(this.id, newPassword);
        this.password = newPassword;
    }

    static createJWT(user: User, jwtSecret: string): string {
        return jwt.sign({
            username: user.username,
            h: shake256(user.password, SHAKE256_LENGTH),
        }, jwtSecret);
    }
}

export default User;
