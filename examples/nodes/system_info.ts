import { ExecutableNode } from "../../src/core/types";
import { $ } from "bun";

export const run: ExecutableNode = async (args, ctx) => {
    const unameResult = await $`uname -a`.text();
    const dateResult = await $`date`.text();

    return {
        uname: unameResult.trim(),
        date: dateResult.trim()
    };
};