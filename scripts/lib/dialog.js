class CombatEstimateDialog extends FormApplication {
constructor() {
		super();
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
	}
}

Hooks.once('ready', async () => {
	canvas.CombatEstimateDialog = new CombatEstimateDialog();
});
