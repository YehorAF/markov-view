<script setup>
import { ref } from 'vue'
import cytoscape from 'cytoscape'

const nodeAmount = ref(0)
const currentSource = ref("")
const currentTarget = ref("")
const currentMovement = ref("")
const data = ref({"nodes": [], "edges": []})
const formula = ref("")

const lessThanEPS = (x, xprep, EPS) => {
    let xs = []
    for (let i = 0; i < x.length; i++) {
        xs.push(Math.abs(x[i] - xprep[i]))
    }
    return Math.max(...xs) < EPS
}
const calculateNode = (x, a, b, idx) => {
    let d = 0
    for (let i = 0; i < a.length; i++) {
        if (i !== idx) {
            d += a[i] * x[i]
        }
    }
    return (b - d) / a[idx]
}
const calculateGaussSeidel = (x, a, b) => {
    for (let i = 0; i < a.length; i++) {
        x[i] = calculateNode(x, a[i], b[i], i)
    }

    return x
}
const iterateGaussSeidel = (x, a, b, N, EPS) => {
    let xprep = [...x]
    let i = 0

    while (true) {
        x = calculateGaussSeidel(x, a, b)
        if (i > N || lessThanEPS(x, xprep, EPS)) {
            break
        }
        i += 1
    }

    return x
}

const addNode = () => {
    if (nodeAmount.value < 50) {
        data.value.nodes.push({
            id: nodeAmount.value,
            name: `S${nodeAmount.value}`
        })
        nodeAmount.value++
        drawGraph()
    }
}
const removeNode = () => {
    if (nodeAmount.value > 0) {
        nodeAmount.value--
        data.value.nodes = data.value.nodes.filter(
            element => element.id !== nodeAmount.value
        )
        data.value.edges = data.value.edges.filter(element => 
            element.target !== nodeAmount.value && 
            element.source !== nodeAmount.value
        )
        drawGraph()
    }
}
const addEdge = () => {
    if (!currentMovement.value || currentMovement.value < 0.001) {
        return
    }
    const nodes = data.value.nodes.filter(element => 
        element.id == currentSource.value ||
        element.id == currentTarget.value
    )
    const isSuchEdge = data.value.edges.find(element => 
        element.source == currentSource.value && 
        element.target == currentTarget.value
    )

    if (
        currentSource.value !== currentTarget.value &&
        !isSuchEdge && nodes.length === 2
    ) {
        data.value.edges.push({
            source: Number.parseInt(currentSource.value),
            target: Number.parseInt(currentTarget.value),
            label: Number.parseFloat(currentMovement.value)
        })
        drawGraph()
    }
}
const removeEdge = (source = NaN, target = NaN) => {
    data.value.edges = data.value.edges.filter(element => 
        element.source != source && element.target != target
    )
    drawGraph()
}

const getNodes = (data) => {
    const nodes = []

    data.forEach(element => {
        nodes.push(
            {
                data: {
                    id: element.id,
                    name: element.name,
                    description: "",
                    active: true,
                    width: 140
                },
            }
        )
    })

    return nodes
}
const getEdges = (data) => {
    const edges = []

    data.forEach(element => {
        edges.push(
            {
                data: {
                    id: `${element.source}${element.target}`,
                    source: element.source,
                    target: element.target,
                    label: element.label
                }
            }
        )
    })

    return edges
}
const drawGraph = () => {
    const nodes = getNodes(data.value.nodes)
    const edges = getEdges(data.value.edges)
    const container = document.getElementById("cy")
    const cy = cytoscape({
        container: container,
        elements: {"nodes": nodes, "edges": edges},
        style: [
            {
                selector: "node",
                style: {
                  "background-color": "green",
                  "label": "data(name)"
                }
            },
            {
              selector: "edge",
              style: {
                "width": 1,
                "line-color": "green",
                "target-arrow-color": "green",
                "target-arrow-shape": "triangle",
                "curve-style": "bezier",
                "label": "data(label)"
              }
            }
        ],
    })
}

const parseFormula = () => {
    let case1 = "\\begin{cases}"
    let case2 = "\\begin{cases}"
    let case3 = "\\begin{cases}"
    let a = []
    for (let i = 0; i < nodeAmount.value; i++) {
        case1 += `p_${i}' = `
        a.push([])
        for (let j = 0; j < nodeAmount.value; j++) {
            let value = 0
            if (i === j) {
                let targets = data.value.edges.filter(element => element.source === j)
                targets.forEach(element => {
                    value -= element.label
                })
                if (value < 0) {
                    case1 += `${value}p_${j}`
                    case2 += `${value}p_${j}`
                } else {
                    return
                }
            } else {
                let sources = data.value.edges.filter(element => 
                    element.target === i && element.source === j
                )
                sources.forEach(element => {
                    value += element.label
                })
                if (value === 1) {
                    case1 += `${j === 0 ? '' : '+'} p_${j}`
                    case2 += `${j === 0 ? '' : '+'} p_${j}`
                } else if (value !== 0) {
                    case1 += `${j === 0 ? '' : '+'} ${value}p_${j}`
                    case2 += `${j === 0 ? '' : '+'} ${value}p_${j}`
                }
            }
            a[i].push(value)
        }
        case1 += "\\\\"
        case2 += "= 0\\\\"
    }
    case1 += "\\end{cases}"
    case2 = case2.split("\\\\")
    case2.pop()
    case2.pop()
    case2 = case2.join("\\\\") + "\\\\"

    for (let i = 0; i < nodeAmount.value - 1; i++) {
        case2 += `p_${i} + `
    }

    case2 += `p_${nodeAmount.value - 1} = 1\\\\\\end{cases}`

    formula.value = case1 + case2
    a[nodeAmount.value - 1] = new Array(nodeAmount.value).fill(1)

    let x = new Array(nodeAmount.value)
    x = x.fill(0)
    let b = new Array(nodeAmount.value).fill(0)
    b[nodeAmount.value - 1] = 1

    x = iterateGaussSeidel(x, a, b, 25, 0.0001)
    console.log(x)

    for (let i = 0; i < x.length; i++) {
        case3 += `p_${i} = ${x[i].toFixed(4)}\\\\`
    }
    
    case3 += "\\end{cases}"
    formula.value += case3
}
</script>

<template>
    <div class="content container-fluid d-flex flex-wrap">
        <div class="settings container">
            <div class="mb-3">
                <label class="form-label">Кількість вузлів: {{ nodeAmount }}</label>
                <button class="btn btn-primary btn-sm" @click="addNode">Додати</button>
                <button class="btn btn-danger btn-sm" @click="removeNode">Видалити</button>
            </div>
            <div class="mb-3">
                <label for="source-node" class="form-label">Від вузла</label>
                <input v-model="currentSource" id="source-node" class="edge-inp form-control" type="number" min="0" max="50" step="1" placeholder="Від вузла">
            </div>
            <div class="mb-3">
                <label for="target-node" class="form-label">До вузла</label>
                <input v-model="currentTarget" id="target-node" class="edge-inp form-control" type="number" min="0" max="50" step="1" placeholder="До вузла">
            </div>
            <div class="mb-3">
                <label for="movement" class="form-label">Значення</label>
                <input v-model="currentMovement" id="movement" class="edge-inp form-control" type="number" min="0" step="0.00001" placeholder="Значення">
            </div>
            <div class="mb-3">
                <button class="btn btn-primary btn-sm" @click="addEdge">Додати</button>
                <button class="btn btn-danger btn-sm" @click="removeEdge(currentSource, currentMovement)">Видалити</button>
            </div>
            <div class="edge" v-for="edge in data.edges">
                <span class="edge-data">Від вузла: {{ edge.source }} </span>
                <span class="edge-data">До вузла: {{ edge.target }} </span>
                <span class="edge-data">Значення: {{ edge.label }}</span>
                <span class="edge-data">
                    <button class="btn btn-danger btn-sm" @click="removeEdge(edge.source, edge.target)">Видалити</button>
                </span>
            </div>
            <div>
                <button class="btn btn-primary btn-sm" @click="parseFormula">Розв'язати</button>
            </div>
        </div>
        <div class="results container d-flex flex-wrap justify-content-start">
            <div id="cy" style="width: 600px; height: 400px;"></div>
            <vue-mathjax :formula="formula" />
        </div>
    </div>
</template>

<style scoped>
.content {
    margin: 5px;
}
#cy {
    border: 1px dotted grey ;
}
.edge {
    margin-top: 2px;
    margin-bottom: 2px;
}
.edge-data {
    margin-right: 2px;
}
.settings {
    width: 40%;
    max-width: 450px;
    min-width: 200px;
}
.results {
    width: 60%;
    min-width: 500px;
}
</style>