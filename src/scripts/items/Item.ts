///<reference path="../shop/ShopHandler.ts"/>

interface ShopOptions {
    saveName?: string,
    maxAmount?: number,
    multiplier?: number,
    multiplierDecrease?: boolean,
}

abstract class Item {
    name: KnockoutObservable<string>;
    saveName: string;
    basePrice: number;
    type: any;
    currency: GameConstants.Currency;
    price: KnockoutObservable<number>;
    maxAmount: number;
    multiplier: number;
    multiplierDecrease: boolean;

    _displayName: string;

    constructor(
        name: string,
        basePrice: number,
        currency: GameConstants.Currency = GameConstants.Currency.money,
        shopOptions: ShopOptions = {
            saveName: '',
            maxAmount: Number.MAX_SAFE_INTEGER,
            multiplier: GameConstants.ITEM_PRICE_MULTIPLIER,
            multiplierDecrease: true,
        },
        displayName?: string) {
        this.name = ko.observable(name);
        this.basePrice = basePrice;
        this.currency = currency;
        this.price = ko.observable(this.basePrice);
        // If no custom save name specified, default to item name
        this.saveName = shopOptions?.saveName || name || `${name}|${GameConstants.Currency[currency]}`;
        this.maxAmount = shopOptions?.maxAmount;
        // Multiplier needs to be above 1
        this.multiplier = Math.max(1, shopOptions?.multiplier);
        this.multiplierDecrease = shopOptions?.multiplierDecrease;
        if (!ItemList[this.saveName]) {
            ItemList[this.saveName] = this;
        }

        this._displayName = displayName ?? name;
    }

    totalPrice(amount: number): number {
        if (this.name() == GameConstants.Pokeball[GameConstants.Pokeball.Pokeball]) {
            return Math.max(0, this.basePrice * amount);
        } else {
            const res = (this.price() * (1 - Math.pow(this.multiplier, amount))) / (1 - this.multiplier);
            return Math.max(0, Math.floor(res));
        }
    }

    buy(n: number) {
        if (n <= 0) {
            return;
        }

        if (n > this.maxAmount) {
            Notifier.notify({
                message: `You can only buy ${this.maxAmount} &times; ${GameConstants.humanifyString(this.name())}!`,
                type: NotificationConstants.NotificationOption.danger,
            });
            n = this.maxAmount;
        }

        if (!this.isAvailable()) {
            Notifier.notify({
                message: `${GameConstants.humanifyString(this.name())} is sold out!`,
                type: NotificationConstants.NotificationOption.danger,
            });
            return;
        }

        const multiple = n > 1 ? 's' : '';

        if (App.game.wallet.hasAmount(new Amount(this.totalPrice(n), this.currency))) {
            App.game.wallet.loseAmount(new Amount(this.totalPrice(n), this.currency));
            this.gain(n);
            this.increasePriceMultiplier(n);
            Notifier.notify({
                message: `You bought ${n} ${GameConstants.humanifyString(this.name())}${multiple}`,
                type: NotificationConstants.NotificationOption.success,
            });
        } else {
            let curr = GameConstants.camelCaseToString(GameConstants.Currency[this.currency]);
            switch (this.currency) {
                case GameConstants.Currency.money:
                    break;
                default:
                    curr += 's';
                    break;
            }
            Notifier.notify({
                message: `You don't have enough ${curr} to buy ${n} ${GameConstants.humanifyString(this.name()) + multiple}`,
                type: NotificationConstants.NotificationOption.danger,
            });
        }
    }

    gain(n: number) {
        player.gainItem(this.name(), n);
    }

    abstract use();

    isAvailable(): boolean {
        return true;
    }

    increasePriceMultiplier(n = 1) {
        player.itemMultipliers[this.saveName] = Math.min(100, (player.itemMultipliers[this.saveName] || 1) * Math.pow(this.multiplier, n));
        this.price(Math.round(this.basePrice * player.itemMultipliers[this.saveName]));
    }

    decreasePriceMultiplier(n = 1) {
        if (!this.multiplierDecrease) {
            return;
        }
        player.itemMultipliers[this.saveName] = Math.max(1, (player.itemMultipliers[this.saveName] || 1) / Math.pow(this.multiplier, n));
        this.price(Math.round(this.basePrice * player.itemMultipliers[this.saveName]));
    }

    get displayName() {
        return GameConstants.humanifyString(this._displayName);
    }
}

const ItemList: { [name: string]: Item } = {};
