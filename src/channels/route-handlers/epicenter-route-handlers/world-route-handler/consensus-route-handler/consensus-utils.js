export function makeConsensusService(consensisAPIResponse) {
    return new window.F.service.Consensus({
        name: consensisAPIResponse.stage,
        consensusGroup: consensisAPIResponse.name,
        worldId: consensisAPIResponse.worldId,
    });
}
