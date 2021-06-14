/**
 * Uses room visuals to render a path.
 * @param startPos The pos the path should start from, used to prevent rendering paths already travelled
 * @param path The path to render
 */
export function drawPath(startPos: RoomPosition, path: PathStep[]): void {
    if(path.length === 0) {
        return;
    }

    const visual = new RoomVisual(startPos.roomName);
    const lastPathStep = path[path.length - 1];
    visual.circle(lastPathStep.x, lastPathStep.y,
        { radius: 0.35, fill: 'transparent', stroke: '#51ff8b', strokeWidth: 0.15, opacity: 0.2 }
    );
    const poly: Array<[number, number]> = [];
    for(let i = path.length - 1; i >= 0; i--) {
        if(path[i].x === startPos.x && path[i].y === startPos.y) {
            break;
        }
        poly.push([path[i].x, path[i].y]);
    }
    visual.poly(poly,
        { lineStyle: 'dashed', fill: 'transparent', stroke: '#51ff8b', strokeWidth: 0.15, opacity: 0.2 }
    );
}
