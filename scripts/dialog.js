import { EncounterUtils5e } from "./dnd5e/EncounterUtils5e.js";
import { NPCActor5e } from "./dnd5e/NPCActor5e.js";
import { PCActor5e } from "./dnd5e/PCActor5e.js";
import { FoundryUtils } from "./utils/FoundryUtils.js";
import { GeneralUtils } from "./utils/GeneralUtils.js";
import { ActorUtils } from "./utils/ActorUtils.js";

export class CombatEstimateDialog extends FormApplication {
constructor() {
		super();
		this.friendlyCombatants = [];
		this.hostileCombatants = [];
		this.friendlyExpectedDamages = [];
		this.hostileExpectedDamages = [];
	}

	static get defaultOptions() {
		let dialogTemplate = `modules/combat-estimate/templates/CombatEstimateDialog.hbs`;
		return { 
			...super.defaultOptions,
			title: game.i18n.localize('CE.dialog.title'),
			id: "CombatEstimateDialog",
			template: dialogTemplate,
			resizable: true,
			width: window.innerWidth > 800 ? 800 : window.innerWidth - 100,
			height: window.innerHeight > 800 ? 800 : window.innerHeight - 100
		}
	}

	async activateListeners(html) {
		super.activateListeners(html);
		const _this=this;
		this.populateCombatants();
	}

	populateCombatants()
	{
		const html = this.element;
		let $friendsList = html.find('#friendly-combatants ul').first();
		let $hostilesList = html.find('#hostile-combatants ul').first();
		if (!game.combat.isActive)
		{
			console.log(`No combat active.`)
			return;
		}

		let combatants = game.combat.combatants;
		this.friendlyCombatants = [];
		this.hostileCombatants = [];

		for (let combatant of combatants)
		{
			if (!combatant.token)
			{
				continue;
			}

			let combatantDisposition = FoundryUtils.getCombatantDisposition(combatant);

			let actorObject = null;
			// Disposition is 1 for friendly, 0 for neutral, -1 for hostile
			switch (combatantDisposition)
			{
				case CONST.TOKEN_DISPOSITIONS.FRIENDLY:
					console.log(`Combatant ${combatant.name} is friendly`);
					actorObject = ActorUtils.getPCActorObject(combatant.actor);
					this.friendlyCombatants.push(actorObject);
					break;
				case CONST.TOKEN_DISPOSITIONS.NEUTRAL:
					console.log(`Combatant ${combatant.name} is neutral`);
					break;
					case CONST.TOKEN_DISPOSITIONS.HOSTILE:
					console.log(`Combatant ${combatant.name} is hostile`);
					actorObject = ActorUtils.getActorObject(combatant.actor);
					this.hostileCombatants.push(actorObject);
					break;
				default:
					console.log(`Combatant ${combatant.name} has unexpected state.`);
					break;
			}
		}

		for (let actorObject of this.friendlyCombatants)
		{
			let combatSummaryHTML = this.getActorCombatSummary(actorObject, this.hostileCombatants, this.friendlyExpectedDamages);
			let actorLink = TextEditor.enrichHTML(actorObject.actor.link);
			$friendsList.append(`
				<li class="combatant-friendly">
					<div class="player-details">
					<span class="creature-button">${actorLink}</span>
					<br/>
					${combatSummaryHTML}
					</div>
				</li>`);
		}
		
		for (let actorObject of this.hostileCombatants)
		{
			let combatSummaryHTML = this.getActorCombatSummary(actorObject, this.friendlyCombatants, this.hostileExpectedDamages);
			let actorLink = TextEditor.enrichHTML(actorObject.actor.link);
			$hostilesList.append(`
				<li class="combatant-hostile">
					<div class="player-details">
					<span class="creature-button">${actorLink}</span>
					<br/>
					${combatSummaryHTML}
					</div>
				</li>`);
		}
		let $hostilesSummary = html.find('#hostile-summary').first();
		$hostilesSummary.append(this.getCombatSummary(this.hostileExpectedDamages, this.friendlyCombatants));
	}

	getActorCombatSummary(actorObject, enemyCombatants, expectedDamagesList)
	{
		let combatSummaryHTML = ``;
		if (actorObject.combatdata.length === 0)
		{
			combatSummaryHTML = "Unable to read combat summary";
			return combatSummaryHTML;
		}

		let attackNumber = 1;
		combatSummaryHTML += `<ul class="actor-attack-summary">`;
		let totalExpectedDamage = 0;
		for (let i = 0; i < actorObject.combatdata.length; i++)
		{
			let currentAttack = actorObject.combatdata[i];
			let getChanceToHit = this.getAttackChanceToHit(currentAttack, enemyCombatants);
			let expectedDamage = currentAttack.averagedamage * currentAttack.numberofattacks * getChanceToHit;
			totalExpectedDamage += expectedDamage;
			combatSummaryHTML += `<li class="single-attack"><div>`;
			combatSummaryHTML += `<span class="encounter-attacknumber">#${attackNumber}</span>`;
			combatSummaryHTML += `<span class="encounter-attackdescription">${currentAttack.attackdescription}</span>`;
			// combatSummaryHTML += `<span class="encounter-attackbonustohit">Bonus: ${currentAttack.attackbonustohit}</span>`;
			combatSummaryHTML += `<span class="encounter-averagedamage">Damage: ${currentAttack.averagedamage * currentAttack.numberofattacks}</span>`;
			// combatSummaryHTML += `<span class="encounter-numberofattacks"># of Attacks: ${currentAttack.numberofattacks}</span>`;
			combatSummaryHTML += `<span class="encounter-percentchance">% to hit: ${(getChanceToHit * 100).toFixed(0)}%</span>`;
			combatSummaryHTML += `</div></li>`;
			attackNumber++;
		}
		combatSummaryHTML += `</ul>`;
		expectedDamagesList.push(totalExpectedDamage);
		return combatSummaryHTML;
	}

	getCombatSummary(summaryStats, enemyCombatants)
	{
		let combatSummaryHTML = ``;
		let totalExpectedDamage = 0;
		summaryStats.map(s => totalExpectedDamage += s);
		let totalEnemyHP = this.getTotalCurrentEnemyHP(enemyCombatants);
		let expectedRoundsToFinish = Math.ceil(totalEnemyHP / totalExpectedDamage);
		combatSummaryHTML += `<span class="encounter-expecteddamage">Expected: ${totalExpectedDamage.toFixed(1)}dmg</span>`;
		combatSummaryHTML += `<span class="encounter-enemyhp">Enemy HP: ${totalEnemyHP}</span>`;
		combatSummaryHTML += `<span class="encounter-roundstodown">Rounds to Down Enemies: ${expectedRoundsToFinish}</span>`;
		return combatSummaryHTML;
	}

	getAttackChanceToHit(currentAttack, enemyCombatants)
	{
		let attackBonus = currentAttack.attackbonustohit;
		let attackChances = [];
		let attackChanceTotal = 0;
		for (let i = 0; i < enemyCombatants.length; i++)
		{
			let currentEnemy = enemyCombatants[i];
			let enemyArmorClass = ActorUtils.getActorArmorClass(currentEnemy.actor);
			let totalAvailableRollsToHit = 20 - (enemyArmorClass - 1) + attackBonus;
			let chanceToHit = totalAvailableRollsToHit / 20.0;
			attackChanceTotal += chanceToHit;
			attackChances.push(chanceToHit);
		}
		let averageChanceToHit = attackChanceTotal / attackChances.length;
		return averageChanceToHit;
	}

	getTotalCurrentEnemyHP(enemyCombatants)
	{
		let totalHP = 0;
		for (let i = 0; i < enemyCombatants.length; i++)
		{
			let currentEnemy = enemyCombatants[i];
			let currentEnemyHitPoints = ActorUtils.getActorCurrentHP(currentEnemy.actor); // currentEnemy.actor.data.data.attributes.hp.value
			totalHP += currentEnemyHitPoints;
		}
		return totalHP;
	}
}

Hooks.once('ready', async () => {
	canvas.CombatEstimateDialog = new CombatEstimateDialog();
});
