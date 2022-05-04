import { NPCActor5e } from "../dnd5e/NPCActor5e.js";
import { PCActor5e } from "../dnd5e/PCActor5e.js";
import { FoundryUtils } from "./FoundryUtils.js";

export class ActorUtils
{
    static numberRegex = /\b(?<numberOfAttacks>one|two|three|four|five|six|seven|eight|nine|ten|once|twice|thrice|1|2|3|4|5|6|7|8|9)\b/gm;
    static getCreatureTypeForActor(actor)
    {
      return FoundryUtils.getSystemVariableForObject(actor, "CreatureType");
    }
    
    static getLevelKeyForSpell(spell)
    {
      let spellLevel = FoundryUtils.getSystemVariableForObject(spell, "SpellLevel").toString().toLowerCase();

      let fullSpellNameMatch = spellLevel.match(/(?<fullSpellDescription>(?<spellLevel>\d+)(st|nd|rd|th) level|cantrip)/g);

      if (fullSpellNameMatch)
      {
        return spellLevel;
      }

      switch (spellLevel)
      {
        case "1":
          return "1st level";
        case "2":
          return "2nd level";
        case "3":
          return "3rd level";
        default:
          return `${spellLevel}th level`
      }
    }

    static getActorObject(actor)
    {
      let currentSystem = game.system.id;

      if (currentSystem === "dnd5e")
      {
        return new NPCActor5e(actor);
      }
      else if (currentSystem === "pf2e")
      {
        return new NPCActorPf2e(actor);
      }
      else
      {
        throw new Error("Not yet implemented!");
      }
    }

    static getPCActorObject(actor)
    {
      let currentSystem = game.system.id;

      if (currentSystem === "dnd5e")
      {
        return new PCActor5e(actor);
      }
      else if (currentSystem === "pf2e")
      {
        return new PCActorPf2e(actor);
      }
      else
      {
        throw new Error("Not yet implemented!");
      }
    }

    static getActorId(actor)
    {
      if (actor.id)
      {
        return actor.id;
      }
      else
      {
        return actor._id;
      }
    }

    static getActorEnvironments(actor) {
        let environment = FoundryUtils.getDataObjectFromObject(actor).details.environment;
        if (!environment || environment.trim() === "") {
            environment = "Any";
        }

        let environmentArray = environment.split(",");
        environmentArray = environmentArray.map(e => e.trim());
        return environmentArray;
    }

    static getActorArmorClass(actor)
    {
      let currentDataObject = FoundryUtils.getDataObjectFromObject(actor);
      return currentDataObject.attributes.ac.value;
    }

    static getActorCurrentHP(actor)
    {
      let currentDataObject = FoundryUtils.getDataObjectFromObject(actor);
      return currentDataObject.attributes.hp.value;
    }

    
    static getCombatDataPerRound(actorObject) {
      let allAttackResultObjects = [];
      let actor = actorObject.actor;
      try
      {
          let attackList = actor.items.filter(i => (i.type.toLowerCase() === "weapon" || i.type.toLowerCase() === "feat")
              && i.name.toLowerCase() != "multiattack" && i.name.toLowerCase() != "extra attack");
          let multiAttack = actor.items.filter(i => i.name.toLowerCase() === "multiattack" || i.name.toLowerCase() === "extra attack");
          if (multiAttack && multiAttack.length > 0) {
              // Description types supported:
              // <p>The imperial ghoul makes one bite attack and one claws attack.</p>
              // <p>the dragon can use its frightful presence. it then makes three attacks: one with its bite and two with its claws.</p>'
              let multiAttackDescription = ActorUtils.getDescriptionFromItemObject(multiAttack[0]).toLowerCase();
              multiAttackDescription = multiAttackDescription.replaceAll("instead of once", "");
              let parsedAttackList = [];
              for (let i = 0; i < attackList.length; i++) {
                  let currentAttack = attackList[i];
                  let attackName = currentAttack.name.toLowerCase();
                  let sanitizedAttackName = attackName.replaceAll(/\(.+\)/gm, "").trim();
                  sanitizedAttackName = sanitizedAttackName.replaceAll(/\+\d/gm, "").trim();
                  sanitizedAttackName = sanitizedAttackName.replaceAll(/\)/gm, "").trim(); // currently creatures with a recharge attack have the recharge attack named incorrectly
                  // skip if we've removed anything interesting from the attack name
                  if (sanitizedAttackName === "") {
                      continue;
                  }
                  parsedAttackList.push(sanitizedAttackName);
              }
              parsedAttackList.push("melee attack");
              let parsedAttackRegex = parsedAttackList.join("|");
  
              let attackMatches = [...multiAttackDescription.matchAll(`(?<attackDescription>${parsedAttackRegex})`)];
              let numberMatches = [...multiAttackDescription.matchAll(ActorUtils.numberRegex)];
              let orMatches = [...multiAttackDescription.matchAll(`(?<qualifiers>( or | and\/or ))`)];
  
              let previousAttackIndex = -1;
              for (let i = 0; i < attackMatches.length; i++) {
                  let currentAttackMatch = attackMatches[i];
                  let attackObject = attackList.find(a => a.name.toLowerCase().match(currentAttackMatch[0]));
                  if (!attackObject || currentAttackMatch[0] === "melee attack") {
                      attackObject = attackList.find(a => a.type === "weapon");
                  }
                  let currentAttackIndex = currentAttackMatch.index;
                  let numberMatchesBeforeAttack = numberMatches.filter(n => n.index < currentAttackIndex);
                  let correctNumberMatch = numberMatchesBeforeAttack[numberMatchesBeforeAttack.length - 1];
                  let actualNumberOfAttacks = 1;
                  if (correctNumberMatch) {
                      actualNumberOfAttacks = GeneralUtils.getIntegerFromWordNumber(correctNumberMatch[0]);
                  }

                  if (!actualNumberOfAttacks)
                  {
                      console.warn(`Unable to parse number of attacks for multi attack for ${actorObject.actorname}, ${actorObject.actorid}, Multiattack Description: ${multiAttackDescription}`);
                  }

                  let currentAttackObject = ActorUtils.getInfoForAttackObject(attackObject, actualNumberOfAttacks, actorObject);
  
                  if (!currentAttackObject || currentAttackObject.averagedamage === 0) {
                      // Skip because attack is boring and likely is some type of charm feature. 
                      continue;
                  }
  
                  if (previousAttackIndex != -1) {
                      let previousAttackObject = allAttackResultObjects.pop();

                      // Check to see if an or is between the previous attack object and the current
                      let orMatchesBetweenAttacks = orMatches.filter(o => o.index > previousAttackIndex && o.index < currentAttackIndex);
                      if (orMatchesBetweenAttacks.length > 0) {
                          // decide which object is better and push that one.
                          if ((ActorUtils.getTotalDamageForAttackObject(currentAttackObject)) >
                              (ActorUtils.getTotalDamageForAttackObject(previousAttackObject))) {
                              allAttackResultObjects.push(currentAttackObject);
                          }
                          else {
                              allAttackResultObjects.push(previousAttackObject);
                          }
                      }
                      else {
                          allAttackResultObjects.push(previousAttackObject);
                          allAttackResultObjects.push(currentAttackObject);
                      }
                  }
                  else {
                      allAttackResultObjects.push(currentAttackObject)
                      // console.log(`Adding attack ${attackObject.name} for ${actor.name}`);
                  }
                  previousAttackIndex = currentAttackIndex;
              }
  
              if (allAttackResultObjects.length === 0) {
                  let guessedAttack = ActorUtils.guessActorMultiAttack(attackList, multiAttackDescription, actorObject);
                  if (guessedAttack) {
                      console.log(`Attempted to guess attack for ${actor.name}: ${guessedAttack.numberofattacks} ${guessedAttack.attackdescription} attacks.`)
                      allAttackResultObjects.push(guessedAttack);
                  }
              }
          }
          else {
              let bestAttackObject = ActorUtils.getBestSingleAttack(attackList, actorObject);
              let currentAttackObject = ActorUtils.getInfoForAttackObject(bestAttackObject, 1, actorObject);
              if (bestAttackObject)
              {
                  allAttackResultObjects.push(currentAttackObject);
              }
          }
  
          if (allAttackResultObjects.length === 0) {
              console.warn(`Parsed no attack data for actor: ${actor.name}`);
          }
      }
      catch (error)
      {
          console.warn(`Error parsing attack information for ${actor.name}, ${actor.id}. Error: ${error}`);
      }
      return allAttackResultObjects;
  }

  static getBestSingleAttack(attackList, actorObject)
  {
    let bestAttackObject = null;
    let maxDamage = 0;
    for (let i = 0; i < attackList.length; i++) {
        try {
            let currentAttackObject = ActorUtils.getInfoForAttackObject(attackList[i], 1, actorObject);
            let totalDamage = ActorUtils.getTotalDamageForAttackObject(currentAttackObject);
            if (maxDamage < totalDamage) {
                bestAttackObject = attackList[i];
                maxDamage = totalDamage;
            }
        }
        catch (error) {
            console.warn(`Unable to parse attack ${attackList[i].name}: ${error}`);
        }
    }

    return bestAttackObject;
  }

  static getTotalDamageForAttackObject(attackObject)
  {
      let totalDamage = attackObject.averagedamage * attackObject.numberofattacks;
      if (attackObject.hasareaofeffect)
      {
          // Assume AOE attacks hit two PCs
          totalDamage = totalDamage * 2;
      }
      return totalDamage;
  }

  static getSpellDataPerRound(actorObject) {
      let allSpellResultObjects = [];
      let actor = actorObject.actor;
      try
      {
          let spellList = actor.items.filter(i => (i.type.toLowerCase() === "spell"));
          let bestSpellObject = null;
          let maxDamage = 0;
          for (let i = 0; i < spellList.length; i++) {
              try {
                  let currentSpellObject = ActorUtils.getInfoForSpellObject(spellList[i], actorObject);
                  if (!currentSpellObject)
                  {
                      continue;
                  }
                  let totalDamage = currentSpellObject.averagedamage * currentSpellObject.numberofattacks;
                  if (currentSpellObject.hasareaofeffect)
                  {
                      // Assume AOE attacks hit two PCs
                      totalDamage = totalDamage * 2;
                  }
                  if (maxDamage < totalDamage) {
                      bestSpellObject = currentSpellObject;
                      maxDamage = totalDamage;
                  }
              }
              catch (error) {
                  console.warn(`Unable to parse spell attack ${spellList[i].name}`);
                  console.warn(error);
              }
          }
          if (bestSpellObject)
          {
              allSpellResultObjects.push(bestSpellObject);
          }
      }
      catch (error)
      {
          console.warn(`Failed to get spell data per round for ${actorObject.actorname}, ${actorObject.actorid}`);
          console.warn(error);
      }

      return allSpellResultObjects;
  }

  static getBestCombat(actorObject) {
      let totalAttackDamage = 0;
      let totalSpellDamage = 0;

      for (let attack of actorObject.attackdata)
      {
        try
        {
          let attackBonus = attack.attackbonustohit;
          let averageDamage = attack.averagedamage;
          let numberOfAttacks = attack.numberofattacks;

          for (var j = 0; j < numberOfAttacks; j++)
          {
            totalAttackDamage += averageDamage;
          }
        }
        catch (error)
        {
          console.warn(`Failed to add combat summary for creature ${actorObject.actorname}`);
          console.warn(error);
        }
      }

      for (let attack of actorObject.spelldata)
      {
        try
        {
          let attackBonus = attack.attackbonustohit;
          let averageDamage = attack.averagedamage;
          let numberOfAttacks = attack.numberofattacks;

          for (var j = 0; j < numberOfAttacks; j++)
          {
              totalSpellDamage += averageDamage;
          }
        }
        catch (error)
        {
          console.warn(`Failed to calculate spell summary for creature ${actorObject.actorname}`);
          console.warn(error);
        }
      }

      if (totalAttackDamage > totalSpellDamage)
      {
          return actorObject.attackdata;
      }
      else
      {
          return actorObject.spelldata;
      }
  }

  static getModifierFromAttributeScore(attributeScore)
  {
      let modifier = Math.floor((attributeScore - 10) / 2);
      return modifier;
  }

  static getInfoForSpellObject(spellObject, actorObject) {
      if (spellObject.hasDamage === false)
      {
          return;
      }
      let abilityModType = spellObject.abilityMod;
      let parentDataObject = FoundryUtils.getDataObjectFromObject(spellObject.parent);
      let abilityModValue = eval("parentDataObject.abilities." + abilityModType + ".mod");
      let spellDataObject = FoundryUtils.getDataObjectFromObject(spellObject);
      let damageList = spellDataObject.damage.parts;

      let totalDamageForAttack = 0;
      for (let i = 0; i < damageList.length; i++) {
          let damageArray = damageList[i];
          let damageDescription = damageArray[0];
          let damageType = damageArray[1];
          damageDescription = damageDescription.toLowerCase().replaceAll(`[${damageType.toLowerCase()}]`, "");
          if (damageType.toLowerCase() === "healing")
          {
              continue;
          }

          let abilitiesModMatches = [...damageDescription.matchAll(/@abilities\.(str|dex|int|con|wis|cha)\.mod/gm)];
          for (let j = 0; j < abilitiesModMatches.length; j++) {
              let abilitiesDescription = abilitiesModMatches[j][0];
              let newAbilitiesDescription = abilitiesDescription.replaceAll("@abilities.", "parentDataObject.abilities.");
              let abilitiesModValue = eval(newAbilitiesDescription);
              damageDescription = damageDescription.replaceAll(abilitiesDescription, abilitiesModValue);
          }

          let totalAverageRollResult = ActorUtils.getAverageDamageFromDescription(damageDescription, abilityModValue);

          totalDamageForAttack += totalAverageRollResult;
      }

      let scalingObject = spellDataObject.scaling;
      if (scalingObject && scalingObject.mode === "cantrip")
      {
          let cantripMultiplier = ActorUtils.getCantripMultiplier(actorObject);
          totalDamageForAttack = totalDamageForAttack * cantripMultiplier;
      }

      if (totalDamageForAttack === 0)
      {
          return;
      }

      let currentAttackResult = {};
      currentAttackResult["averagedamage"] = totalDamageForAttack;
      let isProficient = spellDataObject.prof.hasProficiency;
      let attackBonus = 0;
      if (isProficient) {
          attackBonus += spellDataObject.prof.flat;
      }

      attackBonus += abilityModValue;

      if (spellObject.hasSave)
      {
          attackBonus = ActorUtils.getSaveDC(spellObject) - 10;
      }
      currentAttackResult["attackbonustohit"] = attackBonus;
      currentAttackResult["numberofattacks"] = 1;
      currentAttackResult["hasareaofeffect"] = spellObject.hasAreaTarget;
      currentAttackResult["attackdescription"] = spellObject.name;
      if (isNaN(attackBonus))
      {
          return;
      }
      return currentAttackResult;
  }

  static guessActorMultiAttack(attackList, multiAttackDescription, actorObject) {
      let bestAttackObject = ActorUtils.getBestSingleAttack(attackList, actorObject);
      let actualNumber = 1;
      let numberMatch = multiAttackDescription.match(ActorUtils.numberRegex);
      if (numberMatch) {
          actualNumber = GeneralUtils.getIntegerFromWordNumber(numberMatch[0]);
      }

      return ActorUtils.getInfoForAttackObject(bestAttackObject, actualNumber, actorObject);
  }

  static getInfoForAttackObject(attackObject, numberOfAttacks, actorObject) {
      let abilityModType = attackObject.abilityMod;
      let attackDataObject = FoundryUtils.getDataObjectFromObject(attackObject);
      let parentDataObject = FoundryUtils.getDataObjectFromObject(attackObject.parent);
      let abilityModValue = eval("parentDataObject.abilities." + abilityModType + ".mod");
      let damageList = attackDataObject.damage.parts;

      let totalDamageForAttack = 0;

      if (damageList.length === 0 && attackDataObject.formula != "")
      {
          let damageDescription = attackDataObject.formula;
          damageDescription = damageDescription.toLowerCase().replaceAll(/\[.+\]/gm,"");

          let totalAverageRollResult = ActorUtils.getAverageDamageFromDescription(damageDescription, abilityModValue);
          if (!isNaN(totalAverageRollResult))
          {
              totalDamageForAttack += totalAverageRollResult;
          }
      }
      else
      {
          for (let i = 0; i < damageList.length; i++) {
              let damageArray = damageList[i];
              let damageDescription = damageArray[0];
              let damageType = damageArray[1];
              damageDescription = damageDescription.toLowerCase().replaceAll(`[${damageType.toLowerCase()}]`, "");
              let abilitiesModMatches = [...damageDescription.matchAll(/@abilities\.(str|dex|int|con|wis|cha)\.mod/gm)];
              for (let j = 0; j < abilitiesModMatches.length; j++) {
                  let abilitiesDescription = abilitiesModMatches[j][0];
                  let newAbilitiesDescription = abilitiesDescription.replaceAll("@abilities.", "parentDataObject.abilities.");
                  let abilitiesModValue = eval(newAbilitiesDescription);
                  damageDescription = damageDescription.replaceAll(abilitiesDescription, abilitiesModValue);
              }
  
              let totalAverageRollResult = ActorUtils.getAverageDamageFromDescription(damageDescription, abilityModValue);
              if (isNaN(totalAverageRollResult))
              {
                  if (damageType != "healing")
                  {
                      console.warn(`No damage for ${actorObject.actorname}, ${actorObject.actorid}, attack ${attackObject.name}, damage type ${damageType}`);
                  }
                  continue;
              }
              totalDamageForAttack += totalAverageRollResult;
          }
      }
      let currentAttackResult = {};
      currentAttackResult["averagedamage"] = totalDamageForAttack;
      let isProficient = attackDataObject.proficient;
      let attackBonus = 0;
      if (isProficient) {
          attackBonus += attackDataObject.prof.flat;
      }

      attackBonus += abilityModValue;

      if (attackObject.hasSave)
      {
          attackBonus = ActorUtils.getSaveDC(attackObject) - 10;
      }
      currentAttackResult["attackbonustohit"] = attackBonus;
      currentAttackResult["numberofattacks"] = numberOfAttacks;
      currentAttackResult["hasareaofeffect"] = attackObject.hasAreaTarget;
      currentAttackResult["attackdescription"] = attackObject.name;

      if (isNaN(attackBonus) || isNaN(numberOfAttacks) || isNaN(totalDamageForAttack))
      {
          console.warn(`Invalid attack data for ${actorObject.actorname}, ${actorObject.actorid}. Average damage: ${currentAttackResult.averagedamage}, Attack Bonus: ${currentAttackResult.attackbonustohit}, Number of Attacks: ${currentAttackResult.numberofattacks}`);
      }

      return currentAttackResult;
  }

  static getSaveDC(attackObject)
  {
      return FoundryUtils.getDataObjectFromObject(attackObject).save.dc;
  }

  static getCantripMultiplier(actorObject)
  {
      let spellLevel = FoundryUtils.getDataObjectFromObject(actorObject.actor).details.spellLevel;

      if (isNaN(spellLevel) || spellLevel < 5)
      {
          return 1;
      }
      else if (spellLevel < 11)
      {
          return 2;
      }
      else if (spellLevel < 17)
      {
          return 3;
      }
      else
      {
          return 4;
      }
  }

  static getAverageDamageFromDescription(damageDescription, abilityModValue) {
      damageDescription = damageDescription.replaceAll("@mod", abilityModValue);
      let matches = [...damageDescription.matchAll(/((?<diceCount>\d+)d(?<diceType>\d+)(?<removeLowRolls>r\<\=(?<lowRollThreshold>\d))?)/gm)];
      for (let i = 0; i < matches.length; i++) {
          let matchResult = matches[i];
          let entireMatchValue = matchResult[0];
          let matchResultGroups = matchResult.groups;
          let diceCount = matchResultGroups.diceCount;
          let diceType = matchResultGroups.diceType;
          let removeLowRolls = matchResultGroups.removeLowRolls;
          let extraToAddToAverage = 0;
          if (removeLowRolls)
          {
            extraToAddToAverage = 2;
          }
          let diceTypeAverage = (parseInt(diceType) + 1 + extraToAddToAverage) / 2;
          let totalDiceRollAverage = diceTypeAverage * diceCount;
          damageDescription = damageDescription.replaceAll(entireMatchValue, totalDiceRollAverage);
      }

      let spellDamageQualifierMatches = [...damageDescription.matchAll(/\[.+\]/gm)];

      for (let i = 0; i < spellDamageQualifierMatches.length; i++) {
          let matchResult = spellDamageQualifierMatches[i];
          let entireMatchValue = matchResult[0];
          damageDescription = damageDescription.replaceAll(entireMatchValue, "");
      }

      // deal with modules that use a Math.floor function but Math. isn't specified
      damageDescription = damageDescription.replaceAll("floor(", "Math.floor(");
      let totalAverageRollResult = eval(damageDescription);
      return totalAverageRollResult;
  }

  static getActorTraits(actor) {
      let characterTraits = {};

      let actorDataObject = FoundryUtils.getDataObjectFromObject(actor);
      if (actorDataObject.traits.ci.value.length > 0) {
          characterTraits["conditionimmunities"] = actorDataObject.traits.ci.value;
      }
      if (actorDataObject.traits.di.value.length > 0) {
          characterTraits["damageimmunities"] = actorDataObject.traits.di.value;
      }
      if (actorDataObject.traits.dr.value.length > 0) {
          characterTraits["damageresistances"] = actorDataObject.traits.dr.value;
      }
      if (actorDataObject.traits.dv.value.length > 0) {
          characterTraits["damagevulnerabilities"] = actorDataObject.traits.dv.value;
      }

      let actorSpells = actorDataObject.spells;
      let maxSpellLevel = 0;
      for (let i = 1; i <= 9; i++) {
          let currentSpellLevelObject = eval("actorsSpells.spell" + i);
          if (currentSpellLevelObject.max > 0) {
              characterTraits["spellcaster"] = true;
              maxSpellLevel = i;
          }
      }

      // deal with pact magic
      if (actorSpells.pact.max > 0) {
          characterTraits["spellcaster"] = true;
          let pactLevel = actorSpells.pact.level;
          if (maxSpellLevel > pactLevel) {
              maxSpellLevel = pactLevel;
          }
      }
      if (maxSpellLevel > 0) {
          characterTraits["maxspelllevel"] = maxSpellLevel;
          characterTraits["spelldamagetypelist"] = spellList.map(s => s.data.data.damage.parts).filter(p => p.length > 0).map(z => z[0][1]).filter(t => t != "");
      }

      if (actorDataObject.resources.lair.value) {
          characterTraits["lairactions"] = true;
      }

      if (actorDataObject.resources.legact.max > 0) {
          characterTraits["legendaryactions"] = true;
      }

      if (actorDataObject.resources.legres.max > 0) {
          characterTraits["legendaryresistances"] = true;
      }

      let spellList = actor.items.filter(i => i.type === "spell");
      if (spellList.filter(s => s.hasAreaTarget && s.hasDamage && s.name.toLowerCase() != "sleep").length > 0) {
          characterTraits["hasAOESpell"] = true;
      }
  }

  static getDescriptionFromItemObject(item) {
      return FoundryUtils.getDataObjectFromObject(item).description.value;
  }

  static getXPFromActorObject(actor) {
      return FoundryUtils.getDataObjectFromObject(actor).details.xp.value;
  }

  static getCRFromActorObject(actor) {
      return FoundryUtils.getDataObjectFromObject(actor).details.cr;
  }
}