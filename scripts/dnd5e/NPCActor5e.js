import { FoundryUtils } from "../utils/FoundryUtils.js";
import { GeneralUtils } from "../utils/GeneralUtils.js";
import { ActorUtils } from "../utils/ActorUtils.js";

export class NPCActor5e
{
    constructor(data)
    {
        this.actor = data;
        this.actorname = this.actor.name;
        this.actorid = this.actor._id;
        this.actorxp = ActorUtils.getXPFromActorObject(this.actor);
        this.actorcr = ActorUtils.getCRFromActorObject(this.actor);
        this.creaturetype = ActorUtils.getCreatureTypeForActor(this.actor);
        this.environment = ActorUtils.getActorEnvironments(this.actor);
        this.attackdata = ActorUtils.getCombatDataPerRound(this);
        this.spelldata = ActorUtils.getSpellDataPerRound(this);
        this.combatdata = ActorUtils.getBestCombat(this);
    }
}