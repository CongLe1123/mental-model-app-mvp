-- CreateTable
CREATE TABLE "Organ" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "thumbnail" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VisualLayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "opacity" REAL NOT NULL DEFAULT 1.0,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "imagePath" TEXT NOT NULL DEFAULT '',
    "alignX" REAL NOT NULL DEFAULT 0,
    "alignY" REAL NOT NULL DEFAULT 0,
    "alignScale" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VisualLayer_organId_fkey" FOREIGN KEY ("organId") REFERENCES "Organ" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "layerId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL DEFAULT 0,
    "height" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Annotation_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "VisualLayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Annotation_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "ConceptNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConceptNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organId" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDefinition" TEXT NOT NULL DEFAULT '',
    "detailedExplanation" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "authoringStatus" TEXT NOT NULL DEFAULT 'draft',
    "generalInfo" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConceptNode_organId_fkey" FOREIGN KEY ("organId") REFERENCES "Organ" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConceptNode_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "VisualLayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lens" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "explanation" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Relationship_organId_fkey" FOREIGN KEY ("organId") REFERENCES "Organ" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Relationship_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "ConceptNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Relationship_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "ConceptNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReasoningPath" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "guidingQuestion" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReasoningPath_organId_fkey" FOREIGN KEY ("organId") REFERENCES "Organ" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReasoningPathStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pathId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "ReasoningPathStep_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "ReasoningPath" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReasoningPathStep_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "ConceptNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hyperedge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Hyperedge_organId_fkey" FOREIGN KEY ("organId") REFERENCES "Organ" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HyperedgeMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hyperedgeId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "isOutcome" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "HyperedgeMember_hyperedgeId_fkey" FOREIGN KEY ("hyperedgeId") REFERENCES "Hyperedge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HyperedgeMember_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "ConceptNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "url" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "confidence" TEXT NOT NULL DEFAULT 'Medium',
    "confidenceExplanation" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "VisualLayer_organId_order_key" ON "VisualLayer"("organId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ReasoningPathStep_pathId_order_key" ON "ReasoningPathStep"("pathId", "order");
