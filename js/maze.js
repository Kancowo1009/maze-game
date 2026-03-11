export class MazeEngine {
    constructor(size) {
        this.size = size;
        this.grid = Array(size).fill().map(() => Array(size).fill(1));
    }

    generate(x, y) {
        this.grid[y][x] = 0;
        const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]].sort(() => Math.random() - 0.5);
        for (let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (nx > 0 && nx < this.size && ny > 0 && ny < this.size && this.grid[ny][nx] === 1) {
                this.grid[y + dy/2][x + dx/2] = 0;
                this.generate(nx, ny);
            }
        }
        return this.grid;
    }

    // A* 尋路
    findPath(start, target) {
        const openList = [{...start, g: 0, h: this.dist(start, target), parent: null}];
        const closedList = new Set();
        
        while (openList.length > 0) {
            openList.sort((a, b) => (a.g + a.h) - (b.g + b.h));
            const current = openList.shift();
            const key = `${current.x},${current.y}`;
            
            if (current.x === target.x && current.y === target.y) {
                let path = [];
                let temp = current;
                while(temp.parent) { path.push(temp); temp = temp.parent; }
                return path.reverse();
            }

            closedList.add(key);
            const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
            for (let [dx, dy] of neighbors) {
                let nx = current.x + dx, ny = current.y + dy;
                if (nx < 0 || ny < 0 || nx >= this.size || ny >= this.size || this.grid[ny][nx] === 1 || closedList.has(`${nx},${ny}`)) continue;
                
                let g = current.g + 1;
                let h = this.dist({x: nx, y: ny}, target);
                let node = openList.find(o => o.x === nx && o.y === ny);
                if (!node) openList.push({x: nx, y: ny, g, h, parent: current});
                else if (g < node.g) { node.g = g; node.parent = current; }
            }
        }
        return [];
    }
    dist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
}
