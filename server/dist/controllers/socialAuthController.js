import { User } from "../models/User.js";
import zernio from "../config/zernio.js";
import { Account } from "../models/Accounts.js";
//Helper to ensure user has a Zernio Profile.
const getOrCreateZernioProfile = async (user) => {
    try {
        const result = await zernio.profiles.listProfiles();
        const data = result.data;
        const profiles = Array.isArray(data) ? data : data?.profiles || data?.data || [];
        if (profiles.length > 0) {
            const pid = profiles[0]._id || profiles[0].id;
            await User.findByIdAndUpdate(user._id, { zernioProfileId: pid });
            return pid;
        }
        const createResult = await zernio.profiles.createProfile({
            body: { name: `${user.name || user.email}'s workspace` },
        });
        const created = createResult.data?.profile || createResult.data;
        const pid = created?._id || created?.id;
        if (!pid) {
            throw new Error("Failed to create Zernio Profile - no ID returned");
        }
        await User.findByIdAndUpdate(user._id, { zernioProfileId: pid });
        return pid;
    }
    catch (error) {
        console.error("getOrCreateZernioProfile Error:", error?.message || error);
        throw error;
    }
};
// Get OAuth authorization URL 
// GET /api/auth/:platform
export const generateAuthUrl = async (req, res) => {
    try {
        const { platform } = req.params;
        const profileId = await getOrCreateZernioProfile(req.user);
        const origin = req.headers.origin;
        const redirectUrl = `${origin}/accounts`;
        const resut = await zernio.connect.getConnectUrl({
            path: { platform: platform },
            query: {
                profileId,
                redirect_url: redirectUrl
            }
        });
        const data = resut.data;
        console.log("getConnectUrl response:", JSON.stringify(data, null, 2));
        const authUrl = data.authUrl;
        if (!authUrl) {
            throw new Error(`Zernio returned no authUrl. Full response: ${JSON.stringify(data)}`);
        }
        res.json({ url: authUrl });
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
};
// Sync connected accounts  fron zernio into MongoDB
// GET  //api/auth/sync
export const syncAccounts = async (req, res) => {
    try {
        const profileId = await getOrCreateZernioProfile(req.user);
        const resutl = await zernio.accounts.listAccounts({
            query: { profileId }
        });
        const data = resutl.data;
        const zernioAccounts = data?.accounts || (Array.isArray(data) ? data : []);
        const supprotedPlatfomrs = ["twitter", "linkedin", "facebook", "instagram"];
        const syncedAccounts = [];
        for (const zAccount of zernioAccounts) {
            const zid = zAccount._id || zAccount.id;
            if (!zid) {
                console.warn("Skipping account with no ID:", zAccount);
                continue;
            }
            const rawPlatform = (zAccount.platform || zAccount.type || "").toLowerCase();
            const normalizedPlatform = supprotedPlatfomrs.find((p) => rawPlatform.includes(p));
            if (!normalizedPlatform) {
                console.warn(`Skipping unsupported platform: "${rawPlatform}"`);
                continue;
            }
            const account = await Account.findOneAndUpdate({ zernioAccountId: zid }, {
                user: req.user._id,
                platform: normalizedPlatform,
                handle: zAccount.username || zAccount.name || zAccount.handle || "Unknown",
                zernioAccountId: zid,
                status: "connected",
                avatarUrl: zAccount.avatarUrl || zAccount.picture || zAccount.profile_image_url,
            }, { upsert: true, returnDocument: 'after' });
            syncedAccounts.push(account);
        }
        res.json(syncedAccounts);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
};
