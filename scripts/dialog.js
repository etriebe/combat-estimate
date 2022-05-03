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
	}

	static get defaultOptions() {
		let dialogTemplate = `modules/combat-estimate/templates/CombatEstimateDialog.hbs`;
		return { 
			...super.defaultOptions,
			title: game.i18n.localize('CE.dialog.title'),
			id: "CombatEstimateDialog",
			template: dialogTemplate,
			resizable: true,
			width: window.innerWidth > 700 ? 700 : window.innerWidth - 100,
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
			let combatSummaryHTML = this.getCombatSummaryHTML(actorObject, this.hostileCombatants);
			$friendsList.append(`
				<li class="combatant-friendly">
					<div class="player-details">
						${actorObject.actorname} - ${combatSummaryHTML}
					</div>
				</li>`);
		}
		
		for (let actorObject of this.hostileCombatants)
		{
			let combatSummaryHTML = this.getCombatSummaryHTML(actorObject, this.friendlyCombatants);
			$hostilesList.append(`
				<li class="combatant-hostile">
					<div class="player-details">
						${actorObject.actorname} - ${combatSummaryHTML}
					</div>
				</li>`);
		}
	}

	getCombatSummaryHTML(actorObject, enemyCombatants)
	{
		let combatSummaryHTML = ``;
		if (actorObject.combatdata.length === 0)
		{
			combatSummaryHTML = "Unable to read combat summary";
			return combatSummaryHTML;
		}

		let attackNumber = 1;
		combatSummaryHTML += `<ul class="actor-attack-summary">`;
		combatSummaryHTML += `<ul class="actor-attack-summary">`;
		for (let i = 0; i < actorObject.combatdata.length; i++)
		{
			let currentAttack = actorObject.combatdata[i];
			let getChanceToHit = this.getAttackChanceToHit(currentAttack, enemyCombatants);
			combatSummaryHTML += `<li class="single-attack">`;
			combatSummaryHTML += `<span class="encounter-attacknumber">#${attackNumber} | </span>`;
			combatSummaryHTML += `<span class="encounter-attackdescription">${currentAttack.attackdescription}</span>`;
			combatSummaryHTML += `<span class="encounter-attackbonustohit">${currentAttack.attackbonustohit}</span>`;
			combatSummaryHTML += `<span class="encounter-averagedamage">${currentAttack.averagedamage}</span>`;
			combatSummaryHTML += `<span class="encounter-numberofattacks">${currentAttack.numberofattacks}</span>`;
			combatSummaryHTML += `<span class="encounter-percentchance">${(getChanceToHit * 100).toFixed(0)}%</span>`;
			combatSummaryHTML += `</li>`;
			attackNumber++;
		}
		combatSummaryHTML += `</ul>`;

		/*
		combatSummaryHTML = `<div class="combat-summary">Per Round: 
			<span class="combat-numberofattacks">${encounter.combatsummary.totalattacks} attacks</span>
			${encounter.combatsummary.totaldamage > 0 ? `<span class="combat-totaldamage"> | ${encounter.combatsummary.totaldamage} dmg</span>` : ''}
			${encounter.combatsummary.totalaoedamage > 0 ? `<span class="combat-totalaoedamage"> | ${encounter.combatsummary.totalaoedamage} AOE dmg</span>` : ''}
			<span class="combat-averageattackbonus"> | ${encounter.combatsummary.averageattackbonus.toFixed(0)} average attack bonus</span>
		</div>`;
		*/
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
}

Hooks.once('ready', async () => {
	canvas.CombatEstimateDialog = new CombatEstimateDialog();
});
