import { CombatEstimateDialog } from "./dialog.js";
import { FoundryUtils } from "./utils/FoundryUtils.js";

Hooks.once('init', async function ()
{

});

Hooks.once('ready', async function ()
{

});

Hooks.on("renderSidebarTab", (settings) =>
{
	if(!game.user.isGM) {
		return;
	}

	if (settings.id === "combat"){
		const html = settings.element;
		if (html.find("#combatEstimateButton").length !== 0)
		{
			return;
		}
	
		const button = `<button id="combatEstimateButton" style="flex-basis: auto;">
		<i class="fas fa-calculator"></i> Combat Estimate
		</button>`;
		
		let elementToAppendTo = ``;
		if (FoundryUtils.isFoundryVersion10())
		{
			elementToAppendTo = `.combat-tracker-header`;
		}
		else
		{
			elementToAppendTo = `#combat-round`;
		}
		html.find(elementToAppendTo).first().append(button);
		html.find("#combatEstimateButton").on("click", async (e) =>
		{
			e.preventDefault();
			if (!canvas.CombatEstimateDialog?.rendered) await canvas.CombatEstimateDialog.render(true);
		});
	}
});
