/*
*
*	Dark Priest abilities
*
*/
G.abilities[0] =[

// 	First Ability: Plasma Field
{
	//	Type : Can be "onQuery", "onStartPhase", "onDamage"
	trigger : "onUnderAttack",

	// 	require() :
	require : function(damage) {
		this.setUsed(false); // Can be triggered multiple times
		this.creature.protectedFromFatigue = this.testRequirements();
		return this.creature.protectedFromFatigue;
	},

	//	activate() :
	activate : function(damage) {
                if(G.activeCreature.id==this.creature.id){
                    /* only used when unit isn't active */
                    return damage; // Return Damage
                }

                if(this.isUpgraded()&&damage.melee&&!damage.counter){
                    //counter damage
                    var counter=new Damage(
                        this.creature, // Attacker
                        {pure:5}, // Damage Type
                        1, // Area
                        []	// Effects
                    );
                    counter.counter=true;
                    G.activeCreature.takeDamage(counter);
                }

                this.creature.player.plasma  -= 1;

                this.creature.protectedFromFatigue = this.testRequirements();


                damage.damages = {total:0};
                damage.status = "Shielded";
                damage.effect = [];

                damage.noLog = true;

                this.end(true); // Disable message

                G.log("%CreatureName"+this.creature.id+"% is protected by Plasma Field");
		return damage; // Return Damage
	},
},



// 	Second Ability: Electro Shocker
{
	//	Type : Can be "onQuery", "onStartPhase", "onDamage"
	trigger : "onQuery",

	_targetTeam: Team.enemy,

	// 	require() :
	require : function() {
		if( !this.testRequirements() ) return false;
		if (!this.atLeastOneTarget(
					this.creature.adjacentHexs(this.isUpgraded() ? 4 : 1),
					this._targetTeam)) {
			this.message = G.msg.abilities.notarget;
			return false;
		}
		return true;
	},

	// 	query() :
	query : function() {

		var ability = this;
		var dpriest = this.creature;

		G.grid.queryCreature( {
			fnOnConfirm : function() { ability.animation.apply(ability, arguments); },
			team: this._targetTeam,
			id : dpriest.id,
			flipped : dpriest.player.flipped,
			hexs : dpriest.adjacentHexs(this.isUpgraded()?4:1),
		});
	},

	//	activate() :
	activate : function(target, args) {
		var ability = this;
		ability.end();

		var damageAmount = {shock: 12*target.size};

		var damage = new Damage(
			ability.creature, // Attacker
			damageAmount, // Damage Type
			1, // Area
			[]	// Effects
		);

		target.takeDamage(damage);
	},
},



// 	Third Ability: Disruptor Beam
{
	//	Type : Can be "onQuery", "onStartPhase", "onDamage"
	trigger : "onQuery",

	_targetTeam: Team.enemy,

	// 	require() :
	require : function() {
		if(!this.testRequirements()) return false;

		var range = this.creature.adjacentHexs(2);

		// At least one target
		if (!this.atLeastOneTarget(range, this._targetTeam)) {
			this.message = G.msg.abilities.notarget;
			return false;
		}

		// Search Lowest target cost
		var lowestCost = 99;
		var targets = this.getTargets(range);

		targets.each(function() {
			if(!(this.target instanceof Creature)) return false;
			if(lowestCost > this.target.size) lowestCost = this.target.size;
		});

		if(this.creature.player.plasma < lowestCost) {
			this.message = G.msg.abilities.noplasma;
			return false;
		}

		return true;
	},

	// 	query() :
	query : function() {

		var ability = this;
		var dpriest = this.creature;

		G.grid.queryCreature( {
			fnOnConfirm : function() { ability.animation.apply(ability, arguments); },
			optTest : function(hex) { return (hex.creature.size <= dpriest.player.plasma) ; },
			team: this._targetTeam,
			id : dpriest.id,
			flipped : dpriest.player.flipped,
			hexs : dpriest.adjacentHexs(2),
		});
	},

	//	activate() :
	activate : function(target, args) {
		var ability = this;
		ability.end();

		var plasmaCost = target.size;
		var damage = target.baseStats.health-target.health;

                if (this.isUpgraded() && damage<40) damage=40;

		ability.creature.player.plasma -= plasmaCost;

		damage = new Damage(
			ability.creature, // Attacker
			{ pure: damage }, // Damage Type
			1, // Area
			[]	// Effects
		);

		ability.end();

		target.takeDamage(damage);
	},
},



// 	Fourth Ability: Godlet Printer
{
	//	Type : Can be "onQuery", "onStartPhase", "onDamage"
	trigger : "onQuery",

	// 	require() :
	require : function() {
		if( !this.testRequirements() ) return false;

		if(this.creature.player.plasma <= 1) {
			this.message = G.msg.abilities.noplasma;
			return false;
		}
		if(this.creature.player.getNbrOfCreatures() == G.creaLimitNbr) {
			this.message = G.msg.abilities.nopsy;
			return false;
		}
		return true;
	},

	summonRange : 4,

	// 	query() :
	query : function() {
		var ability = this;
		G.grid.updateDisplay(); // Retrace players creatures

                if(this.isUpgraded()) this.summonRange=6;

		// Ask the creature to summon
		G.UI.materializeToggled = true;
		G.UI.toggleDash();
	},

	fnOnSelect : function(hex,args) {
		var crea = G.retreiveCreatureStats(args.creature);
		G.grid.previewCreature(hex.pos, crea, this.creature.player);
	},

	// Callback function to queryCreature
	materialize : function(creature) {
		var crea = G.retreiveCreatureStats(creature);
		var ability = this;
		var dpriest = this.creature;

		G.grid.forEachHexs(function() { this.unsetReachable(); } );

		var spawnRange = dpriest.hexagons[0].adjacentHex(this.summonRange);

		spawnRange.each(function() { this.setReachable(); } );
		spawnRange.filter(function() { return this.isWalkable(crea.size, 0, false);	} );
		spawnRange = spawnRange.extendToLeft(crea.size);

		G.grid.queryHexs( {
			fnOnSelect : function() { ability.fnOnSelect.apply(ability, arguments); },
			fnOnCancel : function() { G.activeCreature.queryMove(); },
			fnOnConfirm : function() { ability.animation.apply(ability, arguments); },
			args : {creature:creature, cost: (crea.size-0)+(crea.level-0)}, // OptionalArgs
			size : crea.size,
			flipped : dpriest.player.flipped,
			hexs : spawnRange
		});
	},

	//	activate() :
	activate : function(hex,args) {
		var creature = args.creature;
		var ability = this;

		var creaStats = G.retreiveCreatureStats(creature);
		var dpriest = this.creature;

		var pos = { x:hex.x, y:hex.y };

		ability.creature.player.plasma -= args.cost;

		//TODO: Make the UI show the updated number instantly

		ability.end();

		ability.creature.player.summon(creature, pos);
	},
}

];
