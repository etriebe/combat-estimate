Hooks.once('init', async function() {

});

Hooks.once('ready', async function() {

});

Hooks.on("renderSidebarTab",(settings) => {
	if(!game.user.isGM || settings.id != "combat")
	{
		return;
	}
	const html = settings.element
	if(html.find("#combatEstimateButton").length !== 0)
	{
		return;
	}

	const button = `<button id="combatEstimateButton" style="flex-basis: auto;">
	<i class="fas fa-calculator"></i> Combat Estimate
	</button>`;
	html.find(`#combat-round`).first().append(button);
	html.find("#combatEstimateButton").on("click",async (e) => {
		e.preventDefault();
		if (!canvas.CombatEstimateDialog?.rendered) await canvas.CombatEstimateDialog.render(true);
	});
});