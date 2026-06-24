declare const _default: () => {
    port: number;
    database: {
        url: string;
    };
    mongodb: {
        uri: string;
        dbName: string;
        optionalEnabled: boolean;
    };
    redis: {
        host: string;
        port: number;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
};
export default _default;
