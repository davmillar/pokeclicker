///<reference path="../../declarations/DataStore/common/Feature.d.ts"/>

import Currency = GameConstants.Currency;

class Breeding implements Feature {
    name = 'Breeding';
    saveKey = 'breeding';

    defaults = {
        eggList: [ko.observable(new Egg()), ko.observable(new Egg()), ko.observable(new Egg()), ko.observable(new Egg())],
        eggSlots: 1,
        queueList: [],
        queueSlots: 0,
    };

    private _eggList: Array<KnockoutObservable<Egg>>;
    private _eggSlots: KnockoutObservable<number>;

    private queueList: KnockoutObservableArray<string>;
    private queueSlots: KnockoutObservable<number>;

    public hatchList: { [name: number]: string[][] } = {};

    constructor() {
        this._eggList = this.defaults.eggList;
        this._eggSlots = ko.observable(this.defaults.eggSlots);
        this.queueList = ko.observableArray(this.defaults.queueList);
        this.queueSlots = ko.observable(this.defaults.queueSlots);

        this._eggList.forEach((egg) => {
            egg.extend({deferred: true});
        });
    }

    initialize(): void {
        this.hatchList[EggType.Fire] = [
            ['Charmander', 'Vulpix', 'Growlithe', 'Ponyta'],
            ['Cyndaquil', 'Slugma', 'Houndour', 'Magby'],
            ['Torchic', 'Numel'],
            ['Chimchar'],
            ['Tepig', 'Pansear'],
            ['Fennekin'],
            ['Litten'],
            ['Scorbunny'],
        ];
        this.hatchList[EggType.Water] = [
            ['Squirtle', 'Lapras', 'Staryu', 'Psyduck'],
            ['Totodile', 'Wooper', 'Marill', 'Qwilfish'],
            ['Mudkip', 'Feebas', 'Clamperl'],
            ['Piplup', 'Finneon', 'Buizel'],
            ['Oshawott', 'Panpour'],
            ['Froakie'],
            ['Popplio'],
            ['Sobble'],
        ];
        this.hatchList[EggType.Grass] = [
            ['Bulbasaur', 'Oddish', 'Tangela', 'Bellsprout'],
            ['Chikorita', 'Hoppip', 'Sunkern'],
            ['Treecko', 'Tropius', 'Roselia'],
            ['Turtwig', 'Carnivine', 'Budew'],
            ['Snivy', 'Pansage'],
            ['Chespin'],
            ['Rowlet'],
            ['Grookey'],
        ];
        this.hatchList[EggType.Fighting] = [
            ['Hitmonlee', 'Hitmonchan', 'Machop', 'Mankey'],
            ['Tyrogue'],
            ['Makuhita', 'Meditite'],
            ['Riolu'],
            ['Throh', 'Sawk'],
            [],
            [],
            [],
        ];
        this.hatchList[EggType.Electric] = [
            ['Magnemite', 'Pikachu', 'Voltorb', 'Electabuzz'],
            ['Chinchou', 'Mareep', 'Elekid'],
            ['Plusle', 'Minun', 'Electrike'],
            ['Pachirisu', 'Shinx'],
            ['Blitzle'],
            [],
            [],
            [],
        ];
        this.hatchList[EggType.Dragon] = [
            ['Dratini', 'Dragonair', 'Dragonite'],
            [],
            ['Bagon', 'Shelgon', 'Salamence'],
            ['Gible', 'Gabite', 'Garchomp'],
            ['Deino', 'Zwellous', 'Hydreigon'],
            [],
            [],
            [],
        ];
        BreedingController.initialize();
    }

    update(delta: number): void {
    }

    canAccess(): boolean {
        return App.game.keyItems.hasKeyItem(KeyItems.KeyItem.Mystery_egg);
    }

    fromJSON(json: Record<string, any>): void {
        if (json == null) {
            return;
        }

        this.eggSlots = json['eggSlots'] ?? this.defaults.eggSlots;

        if (json['eggList'] == null) {
            this._eggList = this.defaults.eggList;
        } else {
            const saveEggList: Record<string, any>[] = json['eggList'];

            for (let i = 0; i < this._eggList.length; i++) {
                if (saveEggList[i] != null) {
                    const egg: Egg = new Egg(null, null, null);
                    egg.fromJSON(saveEggList[i]);
                    this._eggList[i](egg);
                }
            }
        }
        this.queueSlots(json['queueSlots'] ?? this.defaults.queueSlots);
        this.queueList(json['queueList'] ? json['queueList'] : this.defaults.queueList);
    }


    toJSON(): Record<string, any> {
        return {
            eggList: this.eggList.map(egg => egg() === null ? new Egg() : egg().toJSON()),
            eggSlots: this.eggSlots,
            queueList: this.queueList(),
            queueSlots: this.queueSlots(),
        };
    }

    public canBreedPokemon(): boolean {
        return App.game.party.hasMaxLevelPokemon() && (this.hasFreeEggSlot() || this.hasFreeQueueSlot());
    }

    public hasFreeEggSlot(): boolean {
        let counter = 0;
        for (const egg of this._eggList) {
            if (!egg().isNone()) {
                counter++;
            }
        }
        return counter < this._eggSlots();
    }

    public hasFreeQueueSlot(): boolean {
        const slots = this.queueSlots();
        return slots && this.queueList().length < slots;
    }

    public gainEgg(e: Egg) {
        if (e.isNone()) {
            return false;
        }
        for (let i = 0; i < this._eggList.length; i++) {
            if (this._eggList[i]().isNone()) {
                this._eggList[i](e);
                return true;
            }
        }
        console.error(`Error: Could not place ${EggType[e.type]} Egg`);
        return false;
    }

    public gainRandomEgg() {
        return this.gainEgg(this.createRandomEgg());
    }

    public progressEggsBattle(route: number, region: GameConstants.Region) {
        route = MapHelper.normalizeRoute(route, region);
        return this.progressEggs(+Math.sqrt(route).toFixed(2));
    }

    public progressEggs(amount: number) {
        amount *= App.game.oakItems.calculateBonus(OakItems.OakItem.Blaze_Cassette);

        amount = Math.round(amount);
        this.eggList.forEach((egg, index) => {
            egg().addSteps(amount);
            if (this.queueList().length && egg().progress() >= 100) {
                this.hatchPokemonEgg(index);
            }
        });
    }

    public addPokemonToHatchery(pokemon: PartyPokemon): boolean {
        // If they have a free eggslot, add the pokemon to the egg now
        if (this.hasFreeEggSlot()) {
            return this.gainPokemonEgg(pokemon);
        }
        // If they have a free queue, add the pokemon to the queue now
        if (this.hasFreeQueueSlot()) {
            return this.addToQueue(pokemon);
        }
        let message = "You don't have any free egg slots";
        if (this.queueSlots()) {
            message += '<br/>Your queue is full';
        }
        Notifier.notify({
            message,
            type: NotificationConstants.NotificationOption.warning,
        });
        return false;
    }

    public addToQueue(pokemon: PartyPokemon): boolean {
        const queueSize = this.queueList().length;
        if (queueSize < this.queueSlots()) {
            pokemon.breeding = true;
            this.queueList.push(pokemon.name);
            return true;
        }
        return false;
    }

    public removeFromQueue(index: number): boolean {
        console.log('remove from queue:', index);
        const queueSize = this.queueList().length;
        if (queueSize > index) {
            const pokemonName = this.queueList.splice(index, 1)[0];
            App.game.party._caughtPokemon().find(p => p.name == pokemonName).breeding = false;
            return true;
        }
        return false;
    }

    public gainPokemonEgg(pokemon: PartyPokemon): boolean {
        if (!this.hasFreeEggSlot()) {
            Notifier.notify({
                message: "You don't have any free egg slots",
                type: NotificationConstants.NotificationOption.warning,
            });
            return false;
        }
        const egg = this.createEgg(pokemon.name);
        pokemon.breeding = true;
        return this.gainEgg(egg);
    }

    public hatchPokemonEgg(index: number): void {
        const egg: Egg = this._eggList[index]();
        const hatched = egg.hatch();
        if (hatched) {
            this._eggList[index](new Egg());
            this.moveEggs();
            if (this.queueList().length) {
                const nextEgg = this.createEgg(this.queueList.shift());
                this.gainEgg(nextEgg);
            }
        }
    }

    public moveEggs(): void {
        const tempEggList = App.game.breeding._eggList.filter(egg => egg().type != EggType.None);

        this._eggList.forEach((egg, index) => {
            egg(tempEggList[index] ? tempEggList[index]() : new Egg());
        });
    }

    public createEgg(pokemonName: string, type = EggType.Pokemon): Egg {
        const dataPokemon: DataPokemon = PokemonHelper.getPokemonByName(pokemonName);
        return new Egg(type, this.getSteps(dataPokemon.eggCycles), pokemonName);
    }

    public createTypedEgg(type: EggType): Egg {
        const hatchList = this.hatchList[type];
        const hatchable = hatchList.slice(0, player.highestRegion() + 1).filter(list => list.length);

        // highest region has 1/ratio chance, next highest has 1/(ratio ^ 2), etc.
        // Leftover is given to Kanto, making Kanto and Johto equal chance
        const ratio = 2;
        const possibleHatches = GameConstants.expRandomElement(hatchable, ratio);

        const pokemon = GameConstants.randomElement(possibleHatches);
        return this.createEgg(pokemon, type);
    }

    public createRandomEgg(): Egg {
        const type = Math.floor(Math.random() * Object.keys(this.hatchList).length);
        const egg = this.createTypedEgg(type);
        egg.type = EggType.Mystery;
        return egg;
    }

    public createFossilEgg(fossil: string): Egg {
        const pokemonName = GameConstants.FossilToPokemon[fossil];
        const pokemonNativeRegion = PokemonHelper.calcNativeRegion(pokemonName);
        if (pokemonNativeRegion > player.highestRegion()) {
            Notifier.notify({
                message: 'You must progress further before you can uncover this fossil Pokémon!',
                type: NotificationConstants.NotificationOption.warning,
                timeout: 5e3,
            });
            return new Egg();
        }
        return this.createEgg(pokemonName, EggType.Fossil);
    }

    public getSteps(eggCycles: number) {
        if (eggCycles === undefined) {
            return 500;
        } else {
            return eggCycles * 40;
        }
    }

    public calculateBaseForm(pokemonName: string): string {
        const devolution = pokemonDevolutionMap[pokemonName];
        // Base form of Pokemon depends on which regions players unlocked
        if (!devolution || PokemonHelper.calcNativeRegion(devolution) > player.highestRegion()) {
            // No devolutions at all
            // No further devolutions in current unlocked regions
            return pokemonName;
        } else {
            // Recurse onto its devolution
            return this.calculateBaseForm(devolution);
        }
    }

    public getEggSlotCost(slot: number): number {
        return 500 * slot;
    }

    public buyEggSlot(): void {
        const cost: Amount = this.nextEggSlotCost();
        if (App.game.wallet.hasAmount(cost)) {
            App.game.wallet.loseAmount(cost);
            this.gainEggSlot();
        }
    }

    public nextEggSlotCost(): Amount {
        return new Amount(this.getEggSlotCost(this.eggSlots + 1), Currency.questPoint);
    }

    // Knockout getters/setters
    get eggSlots(): number {
        return this._eggSlots();
    }

    set eggSlots(value: number) {
        this._eggSlots(value);
    }

    public gainEggSlot(): void {
        if (this.eggSlots === this.eggList.length) {
            console.error('Cannot gain another eggslot.');
            return;
        }
        this.eggSlots += 1;
    }

    public gainQueueSlot(): void {
        GameHelper.incrementObservable(this.queueSlots);
    }

    get eggList(): Array<KnockoutObservable<Egg>> {
        return this._eggList;
    }

    set eggList(value: Array<KnockoutObservable<Egg>>) {
        this._eggList = value;
    }

    getAllCaughtStatus(): CaughtStatus {
        return GameHelper.enumNumbers(EggType).reduce((status: CaughtStatus, type: EggType) => {
            return this.hatchList[type]
                ? Math.min(status, this.getTypeCaughtStatus(type))
                : status;
        }, CaughtStatus.CaughtShiny);
    }

    getTypeCaughtStatus(type: EggType): CaughtStatus {
        const hatchList = this.hatchList[type];
        if (!hatchList) {
            return CaughtStatus.NotCaught;
        }

        const hatchable = hatchList.slice(0, player.highestRegion() + 1).flat();

        return hatchable.reduce((status: CaughtStatus, pname: string) => {
            return Math.min(status, PartyController.getCaughtStatusByName(pname));
        }, CaughtStatus.CaughtShiny);
    }

    checkCloseModal(): void {
        if (Settings.getSetting('hideHatchery').value == 'queue' && !this.hasFreeEggSlot() && !this.hasFreeQueueSlot()) {
            $('#breedingModal').modal('hide');
        }
        if (Settings.getSetting('hideHatchery').value == 'egg' && !this.hasFreeEggSlot()) {
            $('#breedingModal').modal('hide');
        }
    }

}
