import { FoundryUtils } from "../utils/FoundryUtils.js";
import { ActorUtils } from "../utils/ActorUtils.js";

export class PCActor5e
{
  static numberRegex = /\b(?<numberOfAttacks>one|two|three|four|five|six|seven|eight|nine|ten|once|twice|thrice|1|2|3|4|5|6|7|8|9)\b/gm;
  constructor(data)
  {
    this.actor = data;
    this.actorname = this.actor.name;
    this.actorid = this.actor._id;
    this.attackdata = ActorUtils.getCombatDataPerRound(this, "action");
    this.bonusattackdata = ActorUtils.getCombatDataPerRound(this, "bonus");
    this.spelldata = ActorUtils.getSpellDataPerRound(this, "action");
    this.combatdata = ActorUtils.getBestCombat(this);
    this.classes = this.actor.classes;
    this.level = this.getPlayerClassLevel();
    this.playerclasslist = this.getPlayerClassList();
  }

  getPlayerClassLevel()
  {
    let playerClasses = this.classes;
    let playerClassList = this.getPlayerClassList(playerClasses);
    let totalLevelCount = 0;
    for (let i = 0; i < playerClassList.length; i++)
    {
      let currentClassLevel = FoundryUtils.getDataObjectFromObject(playerClasses[playerClassList[i]]).levels;
      totalLevelCount += currentClassLevel;
    }
    return totalLevelCount;
  }

  getPlayerClassList()
  {
    let playerClassList = Object.keys(this.classes);
    return playerClassList;
  }
}