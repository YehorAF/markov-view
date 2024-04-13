<script setup>
import { ref } from 'vue'
import cytoscape from 'cytoscape'
import * as mathjs from 'mathjs'

const nodeAmount = ref(0)
const currentSource = ref("")
const currentTarget = ref("")
const currentMovement = ref("")
const data = ref({"nodes": [], "edges": [], "cond": [], "step": 1})
const formula = ref("")

const addNode = () => {
    if (nodeAmount.value < 50) {
        data.value.nodes.push({
            id: nodeAmount.value,
            name: `S${nodeAmount.value}`
        })
        data.value.cond.push(0)
        nodeAmount.value++
        drawGraph()
    }
}
const removeNode = () => {
    if (nodeAmount.value > 0) {
        nodeAmount.value--
        data.value.cond.pop(0)
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

    if (!isSuchEdge && nodes.length < 4) {
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
const createFormula = (mtxs) => {
    let formulas = []

    mtxs.forEach(mtx => {
        let mtxFormula = "\\begin{pmatrix}"
        mtx.forEach(row => {
            row.forEach(element => {
                const num = Number.parseFloat(element).toFixed(4)
                mtxFormula += ` ${num} &`
            })
            mtxFormula = mtxFormula.replace(/.{2}$/, "\\\\")
        })
        mtxFormula += "\\end{pmatrix}"
        formulas.push(mtxFormula)
    })
    let joinedFormula = formulas[0] + formulas[1] + "=" + formulas[2]
    joinedFormula = "\\begin{equation}" + joinedFormula + "\\end{equation}"

    return joinedFormula
}
const parseFormula = () => {
    let step = data.value.step
    let mtx = mathjs.multiply(
        mathjs.ones(data.value.nodes.length, data.value.nodes.length), 0
    )
    mtx = mtx.toArray()

    data.value.edges.forEach(element => {
        mtx[element.source][element.target] = element.label
    })

    let prepCondMtx = null
    let condMtx = mathjs.matrix([data.value.cond])

    formula.value = ""

    for (let i = 0; i < step; i++) {
        prepCondMtx = condMtx.toArray()
        condMtx = mathjs.multiply(condMtx, mtx)
        formula.value += createFormula([prepCondMtx, mtx, condMtx.toArray()])
    }

    console.log(formula.value)
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
                <label>Початкові умови</label>
                <div v-for="idx in data.cond.length">
                    <input :value="data.cond[idx - 1]" @input="event => data.cond[idx - 1] = (event.target.value >= 0 && event.target.value <= 1) ? event.target.value : data.cond[idx]" type="number" min="0" max="1" class="form-control">
                </div>
            </div>
            <div class="mb-3">
                <label for="step">Крок</label>
                <input v-model="data.step" id="step" class="form-control" min="1" type="number">
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
                <button class="btn btn-danger btn-sm" @click="removeEdge(currentSource, currentTarget)">Видалити</button>
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