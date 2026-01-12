import cron from "node-cron";
import { SuspendedListener } from "../models/model.suspendedListener.js";
import Listener from "../models/model.listener.js";

/**
 * Starts the cron job to check for expired penalties.
 * Runs every hour.
 */
export const startPenaltyCron = () => {
    // Run every hour at minute 0
    cron.schedule("0 * * * *", async () => {
        console.log("Running penalty expiration check...");
        try {
            const now = new Date();

            // Find all suspended listeners whose suspension time has passed
            const expiredSuspensions = await SuspendedListener.find({
                suspendedUntil: { $lte: now }
            });

            if (expiredSuspensions.length === 0) {
                console.log("No expired penalties found.");
                return;
            }

            console.log(`Found ${expiredSuspensions.length} expired penalties. Processing...`);

            for (const record of expiredSuspensions) {
                // Update listener status back to approved
                const listener = await Listener.findById(record.listenerId);
                if (listener) {
                    listener.status = "approved";
                    await listener.save();
                    console.log(`Listener ${record.listenerId} restored to approved status.`);
                } else {
                    console.warn(`Listener ${record.listenerId} not found during cleanup.`);
                }

                // Remove the suspension record
                await SuspendedListener.findByIdAndDelete(record._id);
            }

            console.log("Penalty expiration check completed.");
        } catch (error) {
            console.error("Error running penalty cron job:", error);
        }
    });

    console.log("Penalty cron job scheduled.");
};
