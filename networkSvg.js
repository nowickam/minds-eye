import { initShader, updateShader } from "./networkShader.js";


Promise.all(
    ["nodes.csv", "links.csv"].map((filename) => d3.csv(filename))
).then((graphData) => {
    const [nodes, links] = graphData;
    let nodesShader = []
    let linksShader = []
    let width = window.innerWidth;
    let height = window.innerHeight;



    const simulation = d3
        .forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-40))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force(
            "link",
            d3
                .forceLink(links)
                .id(function (d) {
                    return d.name;
                })
                .distance(100)
        )
        .on("tick", ticked)

    function updateLinks() {
        const u = d3
            .select(".links")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("x1", function (d) {
                return d.source.x;
            })
            .attr("y1", function (d) {
                return d.source.y;
            })
            .attr("x2", function (d) {
                return d.target.x;
            })
            .attr("y2", function (d) {
                return d.target.y;
            });
    }
    const nodeGeometry = d3
        .select(".nodes")
        .selectAll("g.nodeGeometry")
        .data(nodes)
        .join("g")
        .classed("nodeGeometry", true);
    const logOfRelevance = d3
        .scaleLog()
        .domain(d3.extent(nodes, (d) => +d.nodesize))
        .range([1, 30]);
    const palette = [
        "#7c1158",
        "#bd7ebe",
        "#1a53ff",
        "#ea5545",
        "#f46a9b",
        "#ef9b20",
        "#edbf33",
        "#ede15b",
        "#bdcf32",
        "#fdcce5",
        "#27aeef",
        "#b33dc6",
        "#fd7f6f",
    ];

    nodeGeometry
        .append("circle")
        .attr("r", function (d) {
            return logOfRelevance(d.nodesize);
        })
        .attr("fill", (d) => palette[d.group]);
    nodeGeometry.append("text").text((d) => d.name);

    function updateNodes() {
        d3.select(".nodes")
            .selectAll("g.nodeGeometry")
            .attr("transform", (d) => `translate(${d.x},${d.y})`);
    }

    function updateNodesShader() {
        nodesShader = simulation.nodes().map((d) =>
            // (x adjusted for resolution, y inverted, r scaled accrding to plot)
            new THREE.Vector4(d.x / width, 1 - d.y / height, logOfRelevance(d.nodesize), parseInt(d.group) % 6)
        )
    }
    function updateLinksShader() {
        linksShader = links.map((d) =>
            new THREE.Vector4(d.source.x / width * width / height, 1 - d.source.y / height,
                d.target.x / width * width / height, 1 - d.target.y / height)
        )
    }


    let shaderInitialized = false;
    function ticked() {
        updateLinks();
        updateNodes();

        updateNodesShader();
        updateLinksShader();

        if (!shaderInitialized) {
            initShader(width, height, nodesShader, linksShader);
            shaderInitialized = true;
        }
        updateShader(nodesShader, linksShader);

    }
});