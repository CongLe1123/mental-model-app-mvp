graph LR

    %% Layers
    T[Hierachy Layer]
    R[Route Layer]
    M[Mechanism/Function Layer]
   TR[General Information]

    %% Shared Concept Space
    CN[(Concept Nodes)]

    T --> CN
    M --> CN
    TR --> CN
    R --> CN

    %% Supporting Structures
    RP[Reasoning Paths]
    HE[Hyperedges]
    EV[Evidence & Confidence]

    CN --> RP
    CN --> HE

    RP --> EV
    HE --> EV