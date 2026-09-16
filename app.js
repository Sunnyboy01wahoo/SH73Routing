// =====================================================
// SH73 ROUTING APP
// CLEAN VERSION
// =====================================================

// =====================================================
// DOM REFERENCES
// =====================================================

const canvas =
    document.getElementById("canvas");

const ctx =
    canvas.getContext("2d");

const startNode =
    document.getElementById("startNode");

const endNode =
    document.getElementById("endNode");
const enableRouting =
    document.getElementById(
        "enableRouting"
    );

const weightsDiv =
    document.getElementById("weights");
/// =====================================================
// BASEMAP
// =====================================================

const basemap =
    new Image();

basemap.crossOrigin =
    "anonymous";

basemap.src =
    "https://raw.githubusercontent.com/Sunnyboy01wahoo/Basemap/eb6dd44a1c4acbae98dd2e069ff28f8d07b26ce2/Layout.png";


// =====================================================
// CANVAS
// =====================================================

canvas.width =
    window.innerWidth;

canvas.height =
    window.innerHeight;

// =====================================================
// CONSTRAINTS
// =====================================================

const constraints = [

    "electric",
    "flowlines",
    "pipelines",
    "coastal",
    "protected",
    "sediment",
    "flood",
    "structures",
    "wetlands",
    "waterbodies",
    "soils",
    "utility"

];

// =====================================================
// BUILD SLIDERS
// =====================================================

function buildSliders()
{
    constraints.forEach(c => {

        const label =
            document.createElement("label");

        label.innerText = c;

        const slider =
            document.createElement("input");

        slider.type = "range";
        slider.min = 0;
        slider.max = 10;
        slider.value = 1;
        slider.id = c;

        const value =
            document.createElement("span");

        value.id =
            c + "Value";

        value.innerText = "1";

        weightsDiv.appendChild(label);
        weightsDiv.appendChild(document.createElement("br"));

        weightsDiv.appendChild(slider);
        weightsDiv.appendChild(value);

        weightsDiv.appendChild(document.createElement("br"));
        weightsDiv.appendChild(document.createElement("br"));

    });
}

buildSliders();

// =====================================================
// MAP EXTENT
// =====================================================

const west =
    -93.940575;

const east =
    -93.749342;

const south =
    29.948651;

const north =
    30.158712;

const scale =
    Math.min(
        canvas.width /
        (east - west),

        canvas.height /
        (north - south)
    );

// =====================================================
// MANUAL MAP NUDGE
// =====================================================

const panX = 0; // positive = right, negative = left
const panY = 0;   // positive = down, negative = up

const offsetX =
(
    canvas.width -
    ((east - west) * scale)
) / 2
+
panX;

const offsetY =
(
    canvas.height -
    ((north - south) * scale)
) / 2
+
panY;

// =====================================================
// PROJECTION
// =====================================================

function project(x,y)
{
    return [

        ((x - west) * scale)
        + offsetX,

        ((north - y) * scale)
        + offsetY

    ];
}

// =====================================================
// SCORING
// =====================================================

function getScore(h)
{
    let score = 0;

    constraints.forEach(c => {

        const slider =
            document.getElementById(c);

        score +=

            Number(
                h[c] || 0
            )

            *

            Number(
                slider
                ? slider.value
                : 1
            );

    });

    return score;
}

function getRouteCost(
    route,
    lookup
)
{
    let total = 0;

    route.forEach(id => {

        const h =
            lookup[id];

        if(h)
        {
            total +=
                getScore(h);
        }

    });

    return total;
}

// =====================================================
// COLOR RAMP
// =====================================================

function colorRamp(v)
{
    v =
        Math.max(
            0,
            Math.min(
                1,
                v
            )
        );

    const colors = [

        [44,123,182],   // blue
        [102,194,165],  // teal
        [171,221,164],  // green
        [255,255,191],  // yellow
        [253,174,97],   // orange
        [215,25,28]     // red

    ];

    const scaled =
        v * (colors.length - 1);

    const i =
        Math.floor(scaled);

    const t =
        scaled - i;

    const c1 =
        colors[
            Math.min(
                i,
                colors.length - 1
            )
        ];

    const c2 =
        colors[
            Math.min(
                i + 1,
                colors.length - 1
            )
        ];

    const r =
        Math.round(
            c1[0] +
            (
                (c2[0] - c1[0])
                * t
            )
        );

    const g =
        Math.round(
            c1[1] +
            (
                (c2[1] - c1[1])
                * t
            )
        );

    const b =
        Math.round(
            c1[2] +
            (
                (c2[2] - c1[2])
                * t
            )
        );

    return `rgb(${r},${g},${b})`;
}
// =====================================================
// FIND NEAREST HEX
// =====================================================

function findNearestHex(
    lon,
    lat,
    hexes
)
{
    let nearest =
        null;

    let best =
        Infinity;

    hexes.forEach(h => {

        const dx =
            lon - h.cx;

        const dy =
            lat - h.cy;

        const d =
            dx * dx +
            dy * dy;

        if(d < best)
        {
            best = d;
            nearest = h;
        }

    });

    return nearest;
}

// =====================================================
// DIJKSTRA
// =====================================================

function dijkstra(
    graph,
    start,
    goal,
    lookup
)
{
    const distance = {};
    const previous = {};
    const visited = new Set();

    Object.keys(graph).forEach(id => {

        distance[id] = Infinity;

    });

    distance[start] = 0;

    while(true)
    {
        let current = null;
        let best = Infinity;

        Object.keys(distance).forEach(id => {

            if(
                !visited.has(id)
                &&
                distance[id] < best
            )
            {
                best =
                    distance[id];

                current =
                    id;
            }

        });

        if(current === null)
        {
            break;
        }

        if(current === goal)
        {
            break;
        }

        visited.add(current);

        graph[current].forEach(neighbor => {

            const hex =
                lookup[neighbor];

            if(!hex)
            {
                return;
            }

    const moveCost =
    1 +
    (
        getScore(hex)
        * 0.25
    );

            const alt =
                distance[current]
                +
                moveCost;

            if(
                alt <
                distance[neighbor]
            )
            {
                distance[neighbor] =
                    alt;

                previous[neighbor] =
                    current;
            }

        });

    }

    if(
        distance[goal] === Infinity
    )
    {
        return [];
    }

    const path =
        [goal];

    while(
        path[0] !== start
    )
    {
        path.unshift(
            previous[
                path[0]
            ]
        );
    }

    return path;
}

// =====================================================
// LOAD DATA
// =====================================================

Promise.all([
    fetch("sh73.json")
        .then(r => r.json()),

    fetch("locations.json")
        .then(r => r.json())
])

.then(([hexData, locations]) => {

    const lookup = {};

hexData.forEach(h => {

    lookup[h.h3] = h;

});

// expose for debugging

window.lookup =
    lookup;

    // =================================================
    // NODE DROPDOWNS
    // =================================================

    locations.forEach(l => {

        const s =
            document.createElement("option");

        s.value =
            l.h3;

        s.textContent =
            l.name;

        startNode.appendChild(s);

        const e =
            document.createElement("option");

        e.value =
            l.h3;

        e.textContent =
            l.name;

        endNode.appendChild(e);

    });

    startNode.selectedIndex = 0;
    endNode.selectedIndex = 1;

    // =================================================
    // ROUTING HEXES
    // =================================================

    const routingHexes =
    hexData;

// =================================================
// GRAPH
// =================================================

const graph = {};

routingHexes.forEach(h => {

    graph[h.h3] = [];

});

routingHexes.forEach(a => {

    const neighbors = [];

    routingHexes.forEach(b => {

        if(a.h3 === b.h3)
        {
            return;
        }

        const dx =
            a.cx - b.cx;

        const dy =
            a.cy - b.cy;

        const d =
            dx * dx +
            dy * dy;

        neighbors.push({
            id: b.h3,
            d: d
        });

    });

    neighbors.sort(
        (x,y) =>
            x.d - y.d
    );

    graph[a.h3] =
        neighbors
        .slice(0,12)
        .map(
            n => n.id
        );

});

window.graph = graph;
window.lookup = lookup;
window.routingHexes = routingHexes;
    // =================================================
    // DRAW
    // =================================================

    function draw()
    {
        try
        {
            constraints.forEach(c => {

                const slider =
                    document.getElementById(c);

                const label =
                    document.getElementById(
                        c + "Value"
                    );
if(basemap.complete)
{
    ctx.drawImage(
        basemap,
        0,
        0,
        canvas.width,
        canvas.height
    );
}

                if(
                    slider &&
                    label
                )
                {
                    label.innerText =
                        slider.value;
                }

            });

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );
// =========================================
// BASEMAP
// =========================================

if(
    basemap.complete
)
{
    const topLeft =
        project(
            west,
            north
        );

    const bottomRight =
        project(
            east,
            south
        );

    ctx.globalAlpha =
        1.0;

    ctx.drawImage(
        basemap,
        topLeft[0],
        topLeft[1],
        bottomRight[0] - topLeft[0],
        bottomRight[1] - topLeft[1]
    );
}

            const scores =
    hexData
        .slice(0,3000)
        .map(
            getScore
        );

            const minScore =
                Math.min(...scores);

            const maxScore =
                Math.max(...scores);

            let rendered = 0;

            // =========================================
            // HEATMAP
            // =========================================

            hexData.forEach(h => {

    if(
        !h.coords ||
        !h.coords.value ||
        !Array.isArray(
            h.coords.value
        )
    )
    {
        return;
    }

    const score =
        getScore(h);

    const normalized =
    (score - minScore)
    /
    (
        (maxScore - minScore)
        || 1
    );

    ctx.beginPath();

    h.coords.value.forEach(
        (p,i) =>
        {
            const pt =
                project(
                    p[0],
                    p[1]
                );

            if(i === 0)
            {
                ctx.moveTo(
                    pt[0],
                    pt[1]
                );
            }
            else
            {
                ctx.lineTo(
                    pt[0],
                    pt[1]
                );
            }
        }
    );

    ctx.closePath();

    ctx.fillStyle =
        colorRamp(
            normalized
        );

    ctx.globalAlpha =
    0.55;

ctx.fill();

ctx.globalAlpha =
    1.0;

    rendered++;

});

           // =============================================
// ROUTE
// =============================================

const startLocation =
    lookup[
        startNode.value
    ];

const endLocation =
    lookup[
        endNode.value
    ];

if(
    !startLocation ||
    !endLocation
)
{
    console.error(
        "Missing start/end location"
    );

    return;
}

const startHex =
    findNearestHex(
        startLocation.cx,
        startLocation.cy,
        routingHexes
    );

const endHex =
    findNearestHex(
        endLocation.cx,
        endLocation.cy,
        routingHexes
    );

if(
    !startHex ||
    !endHex
)
{
    console.error(
        "Missing start/end hex"
    );

    return;
}

// expose to console

window.startHex =
    startHex;

window.endHex =
    endHex;

// route solve

const route =
    dijkstra(
        graph,
        startHex.h3,
        endHex.h3,
        lookup
    );

window.route =
    route;

console.log(
    "START HEX:",
    startHex.h3
);

console.log(
    "END HEX:",
    endHex.h3
);

console.log(
    "ROUTE LENGTH:",
    route.length
);

const routeCost =
    getRouteCost(
        route,
        lookup
    );

if(route.length === 0)
{
    console.warn(
        "NO PATH FOUND"
    );
}

if(
    enableRouting.checked &&
    route.length > 0
)
{
    ctx.beginPath();

    route.forEach(
        (id,index) =>
        {
            const h =
                lookup[id];

            if(!h)
            {
                return;
            }

            const pt =
                project(
                    h.cx,
                    h.cy
                );

            if(index === 0)
            {
                ctx.moveTo(
                    pt[0],
                    pt[1]
                );
            }
            else
            {
                ctx.lineTo(
                    pt[0],
                    pt[1]
                );
            }
        }
    );

    ctx.strokeStyle =
        "white";

    ctx.lineWidth =
        6;

    ctx.stroke();

    ctx.strokeStyle =
        "cyan";

    ctx.lineWidth =
        3;

    ctx.stroke();
}

            // =========================================
            // MARKERS
            // =========================================

            if(
    enableRouting.checked
)
{
    const startPt =
        project(
            startHex.cx,
            startHex.cy
        );

    const endPt =
        project(
            endHex.cx,
            endHex.cy
        );

    ctx.beginPath();

    ctx.arc(
        startPt[0],
        startPt[1],
        12,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "lime";

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
        endPt[0],
        endPt[1],
        12,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "red";

    ctx.fill();
}

            // =========================================
            // DEBUG
            // =========================================

            ctx.fillStyle =
                "black";

            ctx.font =
                "16px Arial";

            ctx.fillText(
                `Rendered: ${rendered} / ${hexData.length}`,
                40,
                canvas.height - 180
            );

            ctx.fillText(
                `Routing Hexes: ${routingHexes.length}`,
                40,
                canvas.height - 150
            );

            ctx.fillText(
                `Route Nodes: ${route.length}`,
                40,
                canvas.height - 120
            );

            ctx.fillText(
                `Route Cost: ${routeCost.toFixed(2)}`,
                40,
                canvas.height - 90
            );

            ctx.fillText(
                `Min Score: ${minScore.toFixed(2)}`,
                40,
                canvas.height - 60
            );

            ctx.fillText(
                `Max Score: ${maxScore.toFixed(2)}`,
                40,
                canvas.height - 30
            );
        }
        catch(error)
        {
            console.error(
                "DRAW ERROR:",
                error
            );
        }
    }

    draw();

    startNode.addEventListener(
    "change",
    draw
);

endNode.addEventListener(
    "change",
    draw
);

enableRouting.addEventListener(
    "change",
    draw
);

    constraints.forEach(c => {

        const slider =
            document.getElementById(c);

        if(slider)
        {
            slider.addEventListener(
                "input",
                draw
            );
        }

    });

});
