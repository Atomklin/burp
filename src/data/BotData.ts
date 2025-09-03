export class BotData {
    constructor(
        public readonly config: IBotConfig
    ) {
    }
}

export interface IBotConfig {
    token: string;
}
