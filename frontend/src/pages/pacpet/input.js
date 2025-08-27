export function createInput() {
    const keys = { left: false, right: false, up: false, down: false };

    const onKeyDown = (e) => {
        if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
        if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
        if (e.key === "ArrowUp" || e.key === "w") keys.up = true;
        if (e.key === "ArrowDown" || e.key === "s") keys.down = true;
    };
    const onKeyUp = (e) => {
        if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
        if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
        if (e.key === "ArrowUp" || e.key === "w") keys.up = false;
        if (e.key === "ArrowDown" || e.key === "s") keys.down = false;
    };

    const attach = () => {
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
    };
    const detach = () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
    };

    return { keys, attach, detach };
}
