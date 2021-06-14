import { ClaimJob } from 'jobs/claimJob';
import { IdleJob } from 'jobs/idleJob';
import { SettleJob } from 'jobs/settleJob';
import { ScreepsRequest } from 'requests/request';
import { SpawnRequest } from 'requests/spawnRequest';
import { EmpireManager } from './empireManager';

/**
 * The Empire Manager which controls expansion and colonization of new rooms.
 */
export class ExpansionManager extends EmpireManager {
    public static type = 'expansion';
    public static expansionFlagColors = [COLOR_PURPLE, COLOR_WHITE].join();
    public static oldAge = 50;
    public static workerNumber = 4;
    public static maxAssistLevel = 3;

    public generateRequests(): ScreepsRequest[] {
        const flags = this.parent.flags.get(ExpansionManager.expansionFlagColors);
        if(!flags || flags.length === 0) {
            return [];
        }

        let workerCount = 0;
        let claimerCount = 0;
        for(const worker of this.workers) {
            if(!worker.creep || (worker.creep.ticksToLive || CREEP_LIFE_TIME) < ExpansionManager.oldAge) {
                continue;
            }

            if(worker.creep.getActiveBodyparts(WORK)) {
                workerCount += 1;
            }
            else if (worker.creep.getActiveBodyparts(CLAIM)) {
                claimerCount += 1;
            }
        }

        const requests: ScreepsRequest[] = [];
        for(const flag of flags) {
            const workerTarget = ExpansionManager.workerNumber;
            const claimerTarget = (!flag.room || !flag.room.controller?.owner) ? 1 : 0;

            // TODO(Daniel): Support multiple simultaneous claim directives.
            if(workerTarget <= workerCount && claimerTarget <= claimerCount) {
                continue;
            }

            let closestColony = undefined;
            let closestDistance = Infinity;
            for(const colony of this.parent.colonies.values()) {
                if(flag.pos.roomName === colony.capitalName) {
                    // Don't try to request settlers from the colony being settled.
                    continue;
                }

                const distance = Game.map.getRoomLinearDistance(colony.capitalName, flag.pos.roomName);
                if(distance < closestDistance) {
                    closestColony = colony;
                    closestDistance = distance;
                }
            }

            if(!closestColony) {
                continue;
            }

            if(claimerTarget > claimerCount) {
                requests.push(new SpawnRequest(ExpansionManager.type, closestColony.capitalName, 'claimer', /*priority=*/undefined, /*empireDirect=*/true));
                continue;
            }

            for(let i = workerCount; i < workerTarget; i++){
                requests.push(new SpawnRequest(ExpansionManager.type, closestColony.capitalName, 'worker', /*priority=*/undefined, /*empireDirect=*/true));
            }
        }

        return requests;
    }

    public manage(): void {
        const flags = this.parent.flags.get(ExpansionManager.expansionFlagColors);
        if(!flags || flags.length === 0) {
            return;
        }

        // TODO(Daniel): Support multiple simultaneous claim directives.
        const flag = flags[0];

        for(const worker of this.workers) {
            if(!worker.creep) {
                continue;
            }

            if(worker.job instanceof IdleJob) {
                if(worker.creep.getActiveBodyparts(WORK)) {
                    worker.job = new SettleJob(flag.pos.roomName);
                }
                else if (worker.creep.getActiveBodyparts(CLAIM)) {
                    worker.job = new ClaimJob(flag.pos.roomName);
                }
            }

            worker.work();
        }

        if(flag.room && flag.room.controller && flag.room.controller.my && flag.room.controller.level > ExpansionManager.maxAssistLevel) {
            flag.remove();
        }
    }
}
