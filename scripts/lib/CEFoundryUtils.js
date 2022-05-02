class CEFoundryUtils {

    static isFoundryVersion10()
    {
      return game.version.match(/^10\./) != null;
    }

    static getSystemId()
    {
      return game.system.id;
    }
    static getCompendiums()
    {
        return game.packs.filter((p) => !p.metadata.system || p.metadata.system === game.system.id);
    }

    static getCombatantDisposition(obj)
    {
      if (FoundryUtils.isFoundryVersion10())
      {
        throw new Error("No V10 work done yet");
      }
      else
      {
        return obj.token.data.disposition;
      }
    }

    static getRollResult(rollDescription)
    {
      let diceDescriptionParts = rollDescription.split("d");
  
      if (diceDescriptionParts.length != 2)
      {
        throw new Error(`Invalid dice description specified: ${rollDescription}`);
      }
  
      let numberOfDice = diceDescriptionParts[0];
      let diceSize = diceDescriptionParts[1];
  
      let totalDiceResult = 0;
      for (let i = 0; i < numberOfDice; i++)
      {
        totalDiceResult += Math.floor(Math.random() * diceSize) + 1;
      }
  
      return totalDiceResult;
    }
}