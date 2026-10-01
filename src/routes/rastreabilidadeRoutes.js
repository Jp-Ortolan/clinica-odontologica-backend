const router=require('express').Router();
const auth=require('../middlewares/auth');
const autorizar=require('../middlewares/perfil');
const s=require('../services/rastreabilidadeService');
router.use(auth,autorizar('aluno','professor','coordenador'));
const handle=fn=>async(req,res,next)=>{try{res.json(await fn(req));}catch(e){next(e);}};
router.get('/materiais/:id/lotes',handle(r=>s.lotes(r.params.id)));
router.post('/materiais/:id/movimentos',handle(r=>s.movimentar(r.params.id,r.body,r.user)));
router.get('/pacotes',handle(()=>s.pacotes()));
router.post('/pacotes',handle(r=>s.criarPacote(r.body,r.user)));
router.get('/pacotes/:id',handle(r=>s.pacote(r.params.id)));
router.get('/pacotes/:id/etiqueta',handle(r=>s.etiqueta(r.params.id)));
router.post('/pacotes/:id/processar',handle(r=>s.processarPacote(r.params.id,r.body,r.user)));
for(const tipo of ['consulta','cirurgia']) {
 router.get(`/${tipo}/:id/observacoes`,handle(r=>s.observacoes(tipo,r.params.id)));
 router.post(`/${tipo}/:id/observacoes`,handle(r=>s.registrarObservacao(tipo,r.params.id,r.body,r.user)));
}
module.exports=router;
