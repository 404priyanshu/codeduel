import { Amplify } from "aws-amplify";

Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: "us-east-1_9lrF660Dd",
            userPoolClientId: "2b3o1ckl3t59dme9khiv8clf65",
        },
    },
});